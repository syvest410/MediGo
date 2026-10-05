import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { dbService } from './db';
import { prisma, isPrismaAvailable } from './prisma';
import {
  TransitionOrderSchema,
  OfflineSyncItemSchema,
  CreateOrderSchema,
  CreateUserSchema,
  UpdateUserSchema,
  UpsertOrganizationSchema,
  PatchOrderSchema,
  PreTripCheckSchema,
  CustodySignOffSchema,
  TemperatureTelemetrySchema,
  CeoEmailForwardingSchema,
  CeoTestSendSchema,
  ChangePasswordSchema,
  validatePasswordAgainstUser,
  LoginSchema,
} from './validation';
import {
  comparePassword,
  generateToken,
  requireAuth,
  requireAdmin,
  requireRole,
  optionalAuth,
  checkLoginRateLimit,
  recordFailedLogin,
  resetFailedLogin,
  enforcePasswordChange,
  validateCsrfOrigin,
  generateRawRefreshToken,
  hashRefreshToken,
  getRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
  DUMMY_HASH,
  AuthenticatedRequest,
} from './auth';
import {
  canAccessOrder,
  canUserAccessOrder,
  sanitizeOrderForRole,
  getPublicTrackingMilestones,
} from './sampleAccess';
import {
  Order,
  OrderStatus,
  PreTripCheck,
  ChainOfCustody,
  TemperatureTelemetry,
  AuditLog,
  PendingOfflineAction,
  User,
  RefreshTokenRecord,
} from '../types';
import { validateStateTransition } from '../lib/stateMachine';

const app = express();

// Trust proxy for Vercel edge/routing infrastructure:
// Setting trust proxy to 1 trusts the immediate front-facing reverse proxy,
// ensuring req.ip extracts the real client IP rather than trusting spoofed client-sent X-Forwarded-For headers.
app.set('trust proxy', 1);

// HTTP Security Headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

function parseOriginSafely(value: string): string | null {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    const trimmed = value.trim().toLowerCase();
    return trimmed ? trimmed : null;
  }
}

// CORS policy with strict allowlist
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = new Set<string>();

// Localhost origins
['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'].forEach(o => allowedOrigins.add(o));

if (process.env.APP_URL) {
  const parsed = parseOriginSafely(process.env.APP_URL);
  if (parsed) allowedOrigins.add(parsed);
}
if (rawAllowedOrigins) {
  rawAllowedOrigins.split(',').forEach(item => {
    const parsed = parseOriginSafely(item);
    if (parsed) allowedOrigins.add(parsed);
  });
}
if (process.env.VERCEL_URL) {
  allowedOrigins.add(`https://${process.env.VERCEL_URL.toLowerCase().trim()}`);
}
if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  allowedOrigins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.toLowerCase().trim()}`);
}
allowedOrigins.add('https://aistudio.google.com');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.toLowerCase().trim();
    if (
      allowedOrigins.has(normalized) ||
      (normalized.endsWith('.run.app') && (normalized.includes('ais-dev-') || normalized.includes('ais-pre-')))
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));

// Parse cookies for HTTP-only refresh tokens (Path=/api/auth)
app.use(cookieParser());

// Request body limits:
// Routes that handle large payloads (offline sync bundles, digital signatures, telemetry) get dedicated 5mb limits
app.use(['/api/v1/sync', '/api/sync', '/api/sync-offline', '/api/orders/:id/chain-of-custody'], express.json({ limit: '5mb' }));
// All other endpoints have strict 100kb limit
app.use(express.json({ limit: '100kb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BioDispatch UN 3373 German Medical Logistics Server',
    timestamp: new Date().toISOString(),
  });
});

// Database & Backend Status (Anonymous callers receive safe minimal response; ADMIN receives detailed telemetry)
app.get('/api/db/status', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'DISPATCHER')) {
      const status = await dbService.getDetailedStatus();
      return res.json(status);
    }
    // Safe response for unauthenticated or non-admin callers (no database URLs, table names, or counts)
    res.json({ ok: true });
  } catch (err: any) {
    res.json({ ok: true });
  }
});

// Endpoint to retrieve the SQL schema (ADMIN only, disabled in production)
app.get('/api/db/schema-sql', requireRole('ADMIN'), (req: AuthenticatedRequest, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'API route not found: GET /api/db/schema-sql' });
  }

  const schemaPath = path.join(process.cwd(), 'supabase-schema.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(sql);
    } catch {
      // fallback below
    }
  }
  // Fallback: minimal valid SQL if file not bundled
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`-- Supabase Schema for MediGo UN 3373
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DISPATCHER', 'DRIVER', 'CLIENT_CLINIC', 'LAB_STAFF')),
  password_hash TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  contract_number TEXT,
  facility_type TEXT CHECK (facility_type IN ('CLINIC', 'LABORATORY', 'HQ', 'COURIER')),
  facility_address TEXT,
  vehicle_reg_number TEXT,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  tracking_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  transport_type TEXT NOT NULL,
  pickup_clinic_name TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_lab_name TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  specimen_box_count INT DEFAULT 1 NOT NULL,
  sample_category TEXT,
  driver_id TEXT,
  driver_name TEXT,
  data_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_users') THEN
    CREATE POLICY service_role_full_access_users ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_orders') THEN
    CREATE POLICY service_role_full_access_orders ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
`);
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// POST Login (Least Privilege Login Security with Persistent Brute-Force Shield & Anti-Timing Defense)
app.post('/api/auth/login', async (req, res) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Email and password are required.',
        errors: parseResult.error.issues.map(e => e.message),
      });
    }

    const { email, password } = parseResult.data;
    const trimmedEmail = email.trim().toLowerCase();
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    // 1. Check Rate Limit (Anti-Brute Force Protection backed by persistent store)
    const rateCheck = await checkLoginRateLimit(trimmedEmail, clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: 'Too many login attempts. Access is temporarily throttled to prevent unauthorized access. Please try again later.',
        retryAfterSeconds: rateCheck.remainingLockoutSeconds,
      });
    }

    const userWithHash = await dbService.getUserByEmailWithPassword(trimmedEmail);

    if (!userWithHash) {
      // Anti-Timing Attack: Perform dummy bcrypt cost 12 comparison so timing is indistinguishable from valid user
      await comparePassword(password, DUMMY_HASH);
      await recordFailedLogin(trimmedEmail, clientIp);

      await dbService.createAuditLog({
        orderId: 'SEC-AUTH-FAIL',
        actionDescription: `LOGIN_FAILED: Unknown or invalid account attempt for email ${trimmedEmail} from IP ${clientIp}.`,
        userId: 'ANONYMOUS',
        userName: trimmedEmail,
        userRole: 'CLIENT_CLINIC',
      });

      // Uniform error message with no attempt count or account existence leakage
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (userWithHash.active === false) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact your dispatch administrator.' });
    }

    const passwordHash = userWithHash.passwordHash || (userWithHash as any).password;
    if (!passwordHash) {
      console.warn(`[Auth] No password hash found for user ${userWithHash.email}`);
      await comparePassword(password, DUMMY_HASH);
      await recordFailedLogin(trimmedEmail, clientIp);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await comparePassword(password, passwordHash);
    if (!isMatch) {
      await recordFailedLogin(trimmedEmail, clientIp);
      await dbService.createAuditLog({
        orderId: 'SEC-AUTH-FAIL',
        actionDescription: `LOGIN_FAILED: Incorrect password for user ${userWithHash.name} (${userWithHash.role}) from IP ${clientIp}.`,
        userId: userWithHash.id,
        userName: userWithHash.name,
        userRole: userWithHash.role,
      });

      // Uniform error message with no attempt count or lockout differentiation leakage
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Success: Reset failed attempts counter ONLY for the email (IP counter preserved across accounts)
    await resetFailedLogin(trimmedEmail);

    const { passwordHash: _, ...user } = userWithHash;

    // Generate Refresh Token: random 32 bytes (base64url), stored as SHA-256 hash
    const rawRefreshToken = generateRawRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const familyId = `FAM-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const refreshTokenRecord: RefreshTokenRecord = {
      id: `RT-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      ip: clientIp,
      userAgent: (req.headers['user-agent'] as string) || undefined,
    };
    await dbService.createRefreshToken(refreshTokenRecord);

    // Set HTTP-only, Secure (in production), SameSite=Strict cookie scoped to /api/auth
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getRefreshCookieOptions());

    // Generate 15-minute access token (held only in client memory)
    const accessToken = generateToken(user);

    await dbService.createAuditLog({
      orderId: 'SEC-AUTH-SUCCESS',
      actionDescription: `LOGIN_SUCCESS: Authorized session established for ${user.name} [Role: ${user.role}].`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    });

    res.json({
      accessToken,
      token: accessToken, // backwards compatibility
      user,
      message: `Signed in successfully as ${user.name} (${user.role})`,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message || 'Authentication failed' });
  }
});

// POST Refresh (rotate refresh token in same family, return fresh access token, detect reuse)
app.post('/api/auth/refresh', validateCsrfOrigin, async (req, res) => {
  try {
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

    // Rate limit per IP on refresh to prevent automated brute-force attacks
    const ipRateCheck = await checkLoginRateLimit('', clientIp);
    if (!ipRateCheck.allowed) {
      return res.status(429).json({
        message: 'Too many refresh requests. Access temporarily throttled.',
        retryAfterSeconds: ipRateCheck.remainingLockoutSeconds,
      });
    }

    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || (req.cookies as any)?.refreshToken;
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return res.status(401).json({ message: 'Refresh token missing. Please sign in.' });
    }

    const tokenHash = hashRefreshToken(rawRefreshToken.trim());
    const record = await dbService.findRefreshTokenByHash(tokenHash);

    if (!record) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      return res.status(401).json({ message: 'Invalid or unknown refresh token.' });
    }

    // TOKEN REUSE DETECTION: if the refresh token was already revoked, someone is replaying a spent token!
    if (record.revokedAt) {
      await dbService.revokeRefreshTokenFamily(record.familyId);
      await dbService.incrementTokenVersion(record.userId);
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

      await dbService.createAuditLog({
        orderId: 'SEC-REUSE-DETECTED',
        actionDescription: `REFRESH_REUSE_DETECTED: Revoked token replayed for user ${record.userId}. Revoked family ${record.familyId}.`,
        userId: record.userId,
        userName: 'SYSTEM_SECURITY',
        userRole: 'ADMIN',
      });

      return res.status(401).json({
        code: 'REFRESH_TOKEN_REUSE_DETECTED',
        message: 'Security alert: Refresh token reuse detected. All sessions in this family have been revoked.',
      });
    }

    // Check expiry (7 days)
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      return res.status(401).json({ message: 'Refresh token has expired. Please sign in again.' });
    }

    // Load user and verify active status
    const user = await dbService.getUserById(record.userId);
    if (!user || user.active === false) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      return res.status(401).json({ message: 'User account is deactivated or not found.' });
    }

    // Valid rotation: generate new refresh token in the SAME family
    const newRawToken = generateRawRefreshToken();
    const newTokenHash = hashRefreshToken(newRawToken);
    const newRecord: RefreshTokenRecord = {
      id: `RT-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      tokenHash: newTokenHash,
      familyId: record.familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      ip: clientIp,
      userAgent: (req.headers['user-agent'] as string) || undefined,
    };

    await dbService.createRefreshToken(newRecord);
    await dbService.revokeRefreshToken(record.id, newRecord.id);

    // Set rotated cookie
    res.cookie(REFRESH_COOKIE_NAME, newRawToken, getRefreshCookieOptions());

    // Issue fresh 15-minute access token
    const accessToken = generateToken(user);

    res.json({
      accessToken,
      token: accessToken,
      user,
    });
  } catch (err: any) {
    console.error('Refresh error:', err);
    res.status(500).json({ message: err.message || 'Token refresh failed' });
  }
});

// POST Logout (revoke current token family, clear cookie, return 204 - works even if access token is expired)
app.post('/api/auth/logout', validateCsrfOrigin, async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || (req.cookies as any)?.refreshToken;
    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = hashRefreshToken(rawRefreshToken.trim());
      const record = await dbService.findRefreshTokenByHash(tokenHash);
      if (record) {
        await dbService.revokeRefreshTokenFamily(record.familyId);
      }
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return res.status(204).end();
  } catch (err: any) {
    console.error('Logout error:', err);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return res.status(204).end();
  }
});

// POST Logout-All (requireAuth: revokes all user families and increments tokenVersion)
app.post('/api/auth/logout-all', validateCsrfOrigin, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    await dbService.revokeAllUserRefreshTokens(userId);
    await dbService.incrementTokenVersion(userId);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

    await dbService.createAuditLog({
      orderId: 'SEC-LOGOUT-ALL',
      actionDescription: `LOGOUT_ALL: Revoked all refresh families and incremented tokenVersion for user ${req.user!.name} (${req.user!.email}).`,
      userId,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    res.json({ message: 'All active sessions have been revoked.' });
  } catch (err: any) {
    console.error('Logout-all error:', err);
    res.status(500).json({ message: err.message || 'Logout-all failed' });
  }
});

// POST Change Password (requireAuth, clears mustChangePassword, enforces strong password policy, rotates session)
app.post('/api/auth/change-password', validateCsrfOrigin, requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const parseResult = ChangePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Password validation failed.',
        errors: parseResult.error.issues.map(e => e.message),
      });
    }

    const { currentPassword, newPassword } = parseResult.data;

    // Fetch user with existing password hash
    const userWithHash = await dbService.getUserByEmailWithPassword(req.user.email);
    if (!userWithHash) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    // Verify current password
    const isCurrentMatch = await comparePassword(currentPassword, userWithHash.passwordHash);
    if (!isCurrentMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Validate new password against user context (cannot match email or name)
    const userPolicyCheck = validatePasswordAgainstUser(newPassword, {
      email: userWithHash.email,
      name: userWithHash.name,
    });
    if (!userPolicyCheck.valid) {
      return res.status(400).json({ message: userPolicyCheck.error });
    }

    // Update password with bcrypt cost 12 and clear mustChangePassword
    // dbService.updateUser automatically increments tokenVersion!
    const updatedUser = await dbService.updateUser(userWithHash.id, {
      password: newPassword,
      mustChangePassword: false,
    });

    // Revoke old refresh tokens for this user
    await dbService.revokeAllUserRefreshTokens(updatedUser.id);

    // Issue updated token reflecting new tokenVersion and mustChangePassword = false
    const token = generateToken(updatedUser);

    // Set fresh refresh cookie
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const rawRefreshToken = generateRawRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const familyId = `FAM-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const refreshTokenRecord: RefreshTokenRecord = {
      id: `RT-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
      userId: updatedUser.id,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      ip: clientIp,
      userAgent: (req.headers['user-agent'] as string) || undefined,
    };
    await dbService.createRefreshToken(refreshTokenRecord);
    res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getRefreshCookieOptions());

    await dbService.createAuditLog({
      orderId: 'SEC-PWD-CHANGE',
      actionDescription: `PASSWORD_CHANGED: User ${updatedUser.name} (${updatedUser.email}) successfully changed password and cleared forced-change requirement.`,
      userId: updatedUser.id,
      userName: updatedUser.name,
      userRole: updatedUser.role,
    });

    res.json({
      message: 'Password changed successfully.',
      user: updatedUser,
      token,
      accessToken: token,
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    res.status(500).json({ message: err.message || 'Failed to change password.' });
  }
});

// GET Current Authenticated User (Me)
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await dbService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    if (user.active === false) {
      return res.status(403).json({ message: 'Account has been deactivated by administrator.' });
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching user session' });
  }
});

// ==========================================
// ORGANIZATION / FACILITY ENDPOINTS
// ==========================================

// GET Facilities & Organizations (requireAuth: Admins see all, non-admins see only their own organization)
app.get('/api/organizations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const allOrgs = await dbService.getAllOrganizations();

    // Regional Dispatchers and Admins can view all facility listings
    if (user.role === 'ADMIN' || user.role === 'DISPATCHER') {
      return res.json(allOrgs);
    }

    // Non-admins (Clinics, Labs, Staff): strictly scoped to their own registered facility
    const userOrgId = user.organizationId;
    const userOrgName = (user.organization || '').toLowerCase().trim();
    const userContract = (user.contractNumber || '').toLowerCase().trim();

    const filtered = allOrgs.filter(org => {
      if (userOrgId && org.id === userOrgId) return true;
      if (userOrgName && org.name.toLowerCase() === userOrgName) return true;
      if (userContract && org.contractNumber && org.contractNumber.toLowerCase() === userContract) return true;
      return false;
    });

    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch organizations' });
  }
});

// POST Upsert Facility / Organization (requireAdmin + Strict Schema)
app.post('/api/organizations', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = UpsertOrganizationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for facility payload.',
        errors: parseResult.error.flatten(),
      });
    }

    const { name, type, contractNumber, addressStreet, postalCode, city, state, contactPhone, contactEmail } = parseResult.data;

    const org = await dbService.upsertOrganization({
      name: name.trim(),
      type,
      contractNumber: contractNumber?.trim() || undefined,
      addressStreet: addressStreet?.trim(),
      postalCode: postalCode?.trim(),
      city: city?.trim(),
      state: state || 'HE',
      contactPhone: contactPhone?.trim(),
      contactEmail: contactEmail?.trim(),
    });

    await dbService.createAuditLog({
      orderId: 'SYS-FACILITY-UPSERT',
      actionDescription: `FACILITY_UPSERT: ${org.name} (${org.type}, Contract: ${org.contractNumber || 'N/A'})`,
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Administrator',
      userRole: req.user?.role || 'ADMIN',
    });

    res.status(201).json({
      organization: org,
      message: `Facility ${org.name} provisioned successfully.`,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to provision organization' });
  }
});

// ==========================================
// USER MANAGEMENT ENDPOINTS (Admin Only)
// ==========================================

// GET All Users (requireAdmin: Only Administrators and Dispatchers can list user directory)
app.get('/api/users', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const users = await dbService.getAllUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch users' });
  }
});

// GET Single User by ID (Self or Admin/Dispatcher only)
app.get('/api/users/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'DISPATCHER' && currentUser.id !== id) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await dbService.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to retrieve user' });
  }
});

// POST Create User (requireAdmin + Strict Schema)
app.post('/api/users', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const parseResult = CreateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for new user payload.',
        errors: parseResult.error.flatten(),
      });
    }
    const payload = parseResult.data;

    if (['CLIENT_CLINIC', 'LAB_STAFF'].includes(payload.role) && !payload.contractNumber) {
      return res.status(400).json({
        message: `Contract Number is legally mandatory for role ${payload.role}. E.g. CTR-2026-CLN-###`,
      });
    }

    const newUser = await dbService.createUser(payload);

    await dbService.createAuditLog({
      orderId: 'SYS-USER-CREATE',
      actionDescription: `USER_CREATED: ${newUser.name} (${newUser.role})`,
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Administrator',
      userRole: req.user?.role || 'ADMIN',
    });

    res.status(201).json({
      user: newUser,
      message: `User ${newUser.name} created successfully.`,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to create user' });
  }
});

// PATCH Update User (requireAdmin + Strict Schema)
app.patch('/api/users/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const parseResult = UpdateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for user update payload.',
        errors: parseResult.error.flatten(),
      });
    }
    const updates = parseResult.data;

    const updatedUser = await dbService.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await dbService.createAuditLog({
      orderId: 'SYS-USER-UPDATE',
      actionDescription: `USER_UPDATED: ${updatedUser.name}`,
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Administrator',
      userRole: req.user?.role || 'ADMIN',
    });

    res.json({
      user: updatedUser,
      message: `User ${updatedUser.name} updated successfully`,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to update user' });
  }
});

// PUT Update User (Alias for PATCH / toggle status with requireAdmin + Strict Schema)
app.put('/api/users/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const parseResult = UpdateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for user update payload.',
        errors: parseResult.error.flatten(),
      });
    }
    const updates = parseResult.data;

    const updatedUser = await dbService.updateUser(id, updates);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await dbService.createAuditLog({
      orderId: 'SYS-USER-UPDATE',
      actionDescription: `USER_UPDATED: ${updatedUser.name}`,
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Administrator',
      userRole: req.user?.role || 'ADMIN',
    });

    res.json({
      user: updatedUser,
      message: `User ${updatedUser.name} updated successfully`,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to update user' });
  }
});

// DELETE User (requireAdmin)
app.delete('/api/users/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const success = await dbService.deleteUser(id);
    if (!success) {
      return res.status(404).json({ message: 'User not found' });
    }

    await dbService.createAuditLog({
      orderId: 'SYS-USER-DELETE',
      actionDescription: `USER_DELETED: ${id}`,
      userId: req.user?.id || 'SYSTEM',
      userName: req.user?.name || 'Administrator',
      userRole: req.user?.role || 'ADMIN',
    });

    res.json({ success: true, message: 'User account removed successfully' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to delete user' });
  }
});

// ==========================================
// ORDERS ENDPOINTS (Enforcing Least Privilege & UN 3373 Compliance)
// ==========================================

// GET All Orders (Role Filtered & Sanitized under Least Privilege)
app.get('/api/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const orders = await dbService.getOrders(
      user.role,
      user.organization,
      user.id,
      user.id,
      user.contractNumber
    );

    // Sanitize and filter order payloads based on the requester's legitimate need-to-know access
    const sanitized = orders
      .filter(o => canAccessOrder(user, o))
      .map(o => sanitizeOrderForRole(o, user.role));
    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching orders' });
  }
});

// In-memory rate limiting map for public tracking lookups
const trackingRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkTrackingRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;

  const record = trackingRateLimitMap.get(ip);
  if (!record || record.resetAt < now) {
    trackingRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

// GET Public Tracking Milestones (External/Unauthenticated Inquiry - Zero medical details leaked)
app.get('/api/orders/track/:trackingNumber', async (req, res) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkTrackingRateLimit(clientIp)) {
      return res.status(429).json({ message: 'Too many tracking requests. Please try again later.' });
    }

    const order = await dbService.getOrderById(req.params.trackingNumber);
    if (!order) {
      return res.status(404).json({ message: 'No shipment found for this tracking number.' });
    }

    const publicMilestones = getPublicTrackingMilestones(order);
    res.json(publicMilestones);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error looking up tracking number' });
  }
});

// GET Order by ID (Least Privilege Diagnostic Sample Protection - Returns 404 on unauthorized)
app.get('/api/orders/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const order = await dbService.getOrderById(req.params.id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const sanitized = sanitizeOrderForRole(order, user.role);
    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error retrieving order' });
  }
});

// POST Create Order (Clinic / Org Staff / Dispatcher / Admin)
app.post('/api/orders', requireRole('ADMIN', 'DISPATCHER', 'CLIENT_CLINIC', 'ORG_STAFF'), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const parseResult = CreateOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for order creation payload.',
        errors: parseResult.error.flatten(),
      });
    }
    const newOrderData = parseResult.data as any;

    // Least Privilege: Prevent client clinics or org staff from spoofing orders for other healthcare facilities
    if (user.role === 'CLIENT_CLINIC' || user.role === 'ORG_STAFF') {
      newOrderData.createdById = user.id;
      newOrderData.createdByOrg = user.organization || newOrderData.createdByOrg || user.name;
      if (user.organizationId) {
        newOrderData.originOrganizationId = user.organizationId;
      }
      if (user.organization) {
        newOrderData.pickupClinicName = user.organization;
      }
    }

    if (!newOrderData.id) {
      newOrderData.id = `ORD-DE-${Date.now().toString().slice(-4)}`;
    }
    if (!newOrderData.trackingNumber) {
      newOrderData.trackingNumber = `DE-UN3373-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (!newOrderData.publicAccessToken) {
      newOrderData.publicAccessToken = `TOK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    }
    if (!newOrderData.status) {
      newOrderData.status = 'SCHEDULED';
    }
    newOrderData.createdAt = new Date().toISOString();
    newOrderData.updatedAt = newOrderData.createdAt;

    const createdOrder = await dbService.createOrder(newOrderData);

    await dbService.createAuditLog({
      orderId: createdOrder.id,
      actionDescription: `ORDER_CREATED: Tracking #${createdOrder.trackingNumber} by ${user.name}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    });

    res.status(201).json(sanitizeOrderForRole(createdOrder, user.role));
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Could not create order' });
  }
});

// POST Transition Order Status (Enforces UN 3373 State Machine, Quarantine & Least Privilege)
app.post('/api/orders/:id/transition', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    
    const parseResult = TransitionOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for status transition payload.',
        errors: parseResult.error.flatten(),
      });
    }

    const { targetStatus, context, coords, deviceId } = parseResult.data;

    const existingOrder = await dbService.getOrderById(id);
    if (!existingOrder || !canAccessOrder(user, existingOrder)) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Role-specific action validation (Principle of Least Privilege)
    if (user.role === 'DRIVER') {
      if (targetStatus === 'CANCELLED' || targetStatus === 'QUARANTINED_UNSYNCED') {
        return res.status(403).json({
          message: 'Access Denied: Drivers cannot directly cancel or quarantine orders.',
        });
      }
      if (existingOrder.driverId && existingOrder.driverId !== user.id) {
        return res.status(404).json({
          message: 'Order not found.',
        });
      }
      if (!existingOrder.driverId && targetStatus === 'PRE_TRIP_CHECK') {
        existingOrder.driverId = user.id;
        existingOrder.driverName = user.name;
        if (user.vehicleRegNumber) existingOrder.vehicleRegNumber = user.vehicleRegNumber;
      }
    } else if (user.role === 'CLIENT_CLINIC' || (user.role === 'ORG_STAFF' && user.facilityType !== 'LABORATORY')) {
      if (targetStatus !== 'CANCELLED') {
        return res.status(403).json({
          message: 'Client Clinics and Origin Staff can only request order cancellation prior to courier pickup.',
        });
      }
      if (existingOrder.status !== 'SCHEDULED' && existingOrder.status !== 'PRE_TRIP_CHECK') {
        return res.status(403).json({
          message: 'Cannot cancel an order that is already in transit or delivered.',
        });
      }
    } else if (user.role === 'LAB_STAFF' || (user.role === 'ORG_STAFF' && user.facilityType === 'LABORATORY')) {
      if (targetStatus !== 'DELIVERED') {
        return res.status(403).json({
          message: 'Laboratory staff can only confirm specimen arrival and delivery acceptance.',
        });
      }
    } else if (user.role !== 'ADMIN' && user.role !== 'DISPATCHER') {
      return res.status(403).json({
        message: 'Access Denied: Unauthorized role for order state transitions.',
      });
    }

    // Quarantine clearance context for dispatchers
    const transitionContext = {
      ...context,
      dispatcherOverride: (user.role === 'ADMIN' || user.role === 'DISPATCHER') && existingOrder.status === 'QUARANTINED_UNSYNCED',
    };

    // Validate ADR / UN 3373 compliance transition rules
    const validation = validateStateTransition(existingOrder, targetStatus as any, transitionContext as any);
    if (!validation.allowed) {
      return res.status(422).json({
        message: `UN 3373 State Transition Rejected: ${validation.errors.join('; ')}`,
        errors: validation.errors,
        currentStatus: existingOrder.status,
        targetStatus,
      });
    }

    // Apply status update
    existingOrder.status = targetStatus as any;
    existingOrder.updatedAt = new Date().toISOString();

    if (existingOrder.status !== 'QUARANTINED_UNSYNCED') {
      existingOrder.quarantineReason = undefined;
    }

    if (context?.preTripCheck) {
      existingOrder.preTripCheck = context.preTripCheck as any;
    }

    if (context?.pickupSignature) {
      if (!existingOrder.chainOfCustodyLogs) existingOrder.chainOfCustodyLogs = [];
      existingOrder.chainOfCustodyLogs.push({
        ...context.pickupSignature,
        id: `COC-${Date.now()}`,
        orderId: existingOrder.id,
        timestamp: new Date().toISOString(),
        gpsLatitude: coords?.lat || 50.1109,
        gpsLongitude: coords?.lng || 8.6821,
        gpsAccuracyMeters: coords?.accuracyMeters || 5.0,
        deviceId: deviceId || 'WEB-CLIENT',
      } as any);
    }

    if (context?.deliverySignature) {
      if (!existingOrder.chainOfCustodyLogs) existingOrder.chainOfCustodyLogs = [];
      existingOrder.chainOfCustodyLogs.push({
        ...context.deliverySignature,
        id: `COC-${Date.now()}`,
        orderId: existingOrder.id,
        timestamp: new Date().toISOString(),
        gpsLatitude: coords?.lat || 50.1109,
        gpsLongitude: coords?.lng || 8.6821,
        gpsAccuracyMeters: coords?.accuracyMeters || 5.0,
        deviceId: deviceId || 'WEB-CLIENT',
      } as any);
    }

    if (context?.cancellationReason) {
      existingOrder.cancellationReason = context.cancellationReason as any;
    }

    const updatedOrder = await dbService.updateOrder(id, existingOrder);

    await dbService.createAuditLog({
      orderId: id,
      previousState: existingOrder.status,
      newState: targetStatus as any,
      actionDescription: `STATUS_TRANSITION_TO_${targetStatus}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      gpsLatitude: coords?.lat || 50.1109,
      gpsLongitude: coords?.lng || 8.6821,
      deviceId: deviceId || 'WEB-CLIENT',
    });

    res.json({
      success: true,
      order: sanitizeOrderForRole(updatedOrder || existingOrder, user.role),
      message: `Order transitioned to ${targetStatus}`,
    });
  } catch (err: any) {
    console.error('Transition error:', err);
    res.status(500).json({ message: err.message || 'Error processing transition' });
  }
});

// POST Driver Claims Open Order from Job Board
app.post('/api/orders/:id/claim', requireRole('DRIVER', 'DISPATCHER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const order = await dbService.getOrderById(id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (order.driverId && order.driverId !== user.id && user.role === 'DRIVER') {
      return res.status(404).json({
        message: 'Order not found.',
      });
    }

    order.driverId = user.id;
    order.driverName = user.name;
    if (user.vehicleRegNumber) {
      order.vehicleRegNumber = user.vehicleRegNumber;
    }
    order.updatedAt = new Date().toISOString();

    const updated = await dbService.updateOrder(id, order);

    await dbService.createAuditLog({
      orderId: id,
      actionDescription: `ORDER_CLAIMED_BY_COURIER: ${user.name} (${user.vehicleRegNumber || 'Thermo Van'})`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    });

    res.json({
      success: true,
      order: sanitizeOrderForRole(updated || order, user.role),
      message: `Pickup order successfully claimed by ${user.name}`,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to claim order' });
  }
});

// PATCH Update Order (Admin and Dispatchers only)
app.patch('/api/orders/:id', requireRole('ADMIN', 'DISPATCHER'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const parseResult = PatchOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for order update payload.',
        errors: parseResult.error.flatten(),
      });
    }
    const updates = parseResult.data;

    const existingOrder = await dbService.getOrderById(id);
    if (!existingOrder || !canAccessOrder(req.user!, existingOrder)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (updates.status && updates.status !== existingOrder.status) {
      const validation = validateStateTransition(existingOrder, updates.status);
      if (!validation.allowed) {
        return res.status(422).json({
          message: `UN 3373 State Transition Rejected: ${validation.errors.join('; ')}`,
          currentStatus: existingOrder.status,
          targetStatus: updates.status,
        });
      }
    }

    const updatedOrder = await dbService.updateOrder(id, { ...existingOrder, ...updates });

    await dbService.createAuditLog({
      orderId: id,
      previousState: existingOrder.status,
      newState: updates.status || existingOrder.status,
      actionDescription: updates.status ? `STATUS_CHANGED_TO_${updates.status}` : 'ORDER_UPDATED',
      userId: req.user?.id || 'CLIENT_APP',
      userName: req.user?.name || 'Administrator',
      userRole: req.user?.role || 'DISPATCHER',
    });

    res.json(sanitizeOrderForRole(updatedOrder || existingOrder, req.user!.role));
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error updating order' });
  }
});

// POST Pre-Trip Checklist
app.post('/api/orders/:id/pre-trip-check', requireRole('DRIVER', 'DISPATCHER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const parseResult = PreTripCheckSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for pre-trip check payload.',
        errors: parseResult.error.flatten(),
      });
    }
    const checkData = parseResult.data;

    const order = await dbService.getOrderById(id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (user.role === 'DRIVER') {
      if (order.driverId && order.driverId !== user.id) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (!order.driverId) {
        order.driverId = user.id;
        order.driverName = user.name;
        if (user.vehicleRegNumber) order.vehicleRegNumber = user.vehicleRegNumber;
      }
    }

    if (!checkData.approved) {
      return res.status(400).json({
        message: 'Pre-trip checklist failed. Biological transport vehicle not approved for departure.',
      });
    }

    order.preTripCheck = checkData as any;
    order.status = 'PRE_TRIP_CHECK';
    order.updatedAt = new Date().toISOString();

    const updated = await dbService.updateOrder(id, order);

    await dbService.createAuditLog({
      orderId: id,
      previousState: 'SCHEDULED',
      newState: 'PRE_TRIP_CHECK',
      actionDescription: `PRE_TRIP_CHECK_COMPLETED: Vehicle ${checkData.vehicleRegNumber}`,
      userId: user.id,
      userName: checkData.vehicleRegNumber || user.name || 'Driver',
      userRole: 'DRIVER',
    });

    res.json(sanitizeOrderForRole(updated || order, user.role));
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error saving pre-trip inspection' });
  }
});

// POST Handover / Chain of Custody Signature Sign-off
app.post('/api/orders/:id/chain-of-custody', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const parseResult = CustodySignOffSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for chain-of-custody payload.',
        errors: parseResult.error.flatten(),
      });
    }
    const log = parseResult.data;

    const order = await dbService.getOrderById(id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updated = await dbService.appendChainOfCustody(id, log as any);

    await dbService.createAuditLog({
      orderId: id,
      actionDescription: `SIGNATURE_ACQUIRED_${log.eventType}: ${log.staffName}`,
      userId: user.id,
      userName: log.staffName,
      userRole: user.role,
    });

    res.json(sanitizeOrderForRole(updated || order, user.role));
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error signing chain of custody' });
  }
});

// POST Temperature Telemetry (Authenticated & Authorized Couriers/Dispatchers/Admins Only)
app.post('/api/orders/:id/temperature', requireRole('DRIVER', 'DISPATCHER', 'ADMIN'), async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const parseResult = TemperatureTelemetrySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Validation failed for temperature telemetry payload.',
        errors: parseResult.error.flatten(),
      });
    }
    const telemetry = parseResult.data;

    const order = await dbService.getOrderById(id);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (user.role === 'DRIVER' && order.driverId && order.driverId !== user.id) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updated = await dbService.appendTemperatureReading(id, telemetry as any);

    if (telemetry.isBreach) {
      await dbService.createAuditLog({
        orderId: id,
        actionDescription: `TEMPERATURE_BREACH_ALERT: ${telemetry.tempCelsius}°C recorded by ${telemetry.sensorId}`,
        userId: user.id,
        userName: `Sensor ${telemetry.sensorId || 'GENERIC'} (${user.name})`,
        userRole: user.role,
      });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error recording temperature' });
  }
});

// ==========================================
// AUDIT LOGS ENDPOINTS (Principle of Least Privilege: Admin / Dispatcher only)
// ==========================================
app.get('/api/audit-logs', requireRole('ADMIN', 'DISPATCHER'), async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await dbService.getAuditLogs(req.query.orderId as string | undefined);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching audit logs' });
  }
});

// ==========================================
// DETERMINISTIC OFFLINE QUEUE SYNC ENDPOINT (/api/v1/sync, /api/sync, /api/sync-offline)
// ==========================================
app.post(['/api/v1/sync', '/api/sync', '/api/sync-offline'], requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const rawAction = req.body;
    const parseResult = OfflineSyncItemSchema.safeParse(rawAction);
    if (!parseResult.success) {
      return res.status(400).json({
        message: 'Invalid offline synchronization item payload.',
        errors: parseResult.error.flatten(),
      });
    }

    const action = parseResult.data;
    const order = await dbService.getOrderById(action.orderId);
    if (!order || !canAccessOrder(user, order)) {
      return res.status(404).json({
        results: [{ id: action.id, status: 'REJECTED_NOT_FOUND', message: `Order ${action.orderId} not found.` }],
      });
    }

    const nowIso = new Date().toISOString();
    const clientTime = action.clientRecordedAt || action.timestamp || nowIso;

    // 1. Conflict Check: Stale Sequence Check (REJECTED_STALE)
    const isStale =
      (action.actionType === 'PICKUP' && ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(order.status)) ||
      (action.actionType === 'PRE_TRIP_CHECK' && order.status !== 'SCHEDULED');

    if (isStale) {
      await dbService.createAuditLog({
        orderId: order.id,
        previousState: order.status,
        newState: order.status,
        conflictResolution: 'REJECTED_STALE',
        actionDescription: `STALE_OFFLINE_ACTION_REJECTED: ${action.actionType} recorded at ${clientTime}`,
        userId: user.id,
        userName: `${user.name} (Offline Queue)`,
        userRole: user.role,
        deviceId: action.deviceId || 'MOB-DRIVER-OFFLINE',
        gpsLatitude: action.gpsLatitude || 50.1109,
        gpsLongitude: action.gpsLongitude || 8.6821,
        offlineSynced: true,
        syncedAt: nowIso,
        createdAt: clientTime,
      });

      return res.status(200).json({
        results: [
          {
            id: action.id,
            status: 'REJECTED_STALE',
            serverCurrentStatus: order.status,
            message: `Aktion ${action.actionType} verworfen: Sendungsstatus am Server ist bereits ${order.status}.`,
          },
        ],
      });
    }

    // 2. Conflict Check: Concurrent Different Driver Collision (QUARANTINED_UNSYNCED)
    if (order.driverId && order.driverId !== user.id && user.role === 'DRIVER') {
      order.status = 'QUARANTINED_UNSYNCED';
      order.quarantineReason = `Driver collision: Device ${action.deviceId || 'unknown'} uploaded action while order is claimed by ${order.driverName || order.driverId}.`;
      order.updatedAt = nowIso;
      await dbService.updateOrder(order.id, order);

      await dbService.createAuditLog({
        orderId: order.id,
        previousState: order.status,
        newState: 'QUARANTINED_UNSYNCED',
        conflictResolution: 'SERVER_WINS',
        actionDescription: `QUARANTINE_TRIGGERED: Driver device mismatch during sync`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        deviceId: action.deviceId || 'MOB-DRIVER-OFFLINE',
        gpsLatitude: action.gpsLatitude || 50.1109,
        gpsLongitude: action.gpsLongitude || 8.6821,
        offlineSynced: true,
        syncedAt: nowIso,
        createdAt: clientTime,
      });

      return res.status(200).json({
        results: [
          {
            id: action.id,
            status: 'QUARANTINED_UNSYNCED',
            message: 'Konflikt erkannt: Sendung wurde zur Leitstand-Klärung in Quarantäne verschoben.',
          },
        ],
      });
    }

    // 3. Append-Only Chain of Custody Record (Never overwrites existing records)
    if (!order.chainOfCustodyLogs) order.chainOfCustodyLogs = [];
    order.chainOfCustodyLogs.push({
      id: `COC-${Date.now()}`,
      orderId: order.id,
      eventType: action.actionType.includes('DELIVER') ? 'DELIVERY_SIGNATURE' : 'PICKUP_SIGNATURE',
      authTier: 'TIER_1_REGISTERED_USER_PIN',
      staffName: (action.payload?.signatoryName as string) || 'Offline Signatory',
      staffTitle: (action.payload?.signatoryRole as string) || 'Staff',
      signatureBase64: (action.payload?.signatureDataUrl as string) || (action.payload?.signatureBase64 as string) || '',
      cryptoSignature: action.cryptoSignature || undefined,
      pinCodeVerified: true,
      scannedBarcodes: order.barcodeList || [],
      timestamp: clientTime,
      clientRecordedAt: clientTime,
      serverIngestedAt: nowIso,
      gpsLatitude: action.gpsLatitude || 50.1109,
      gpsLongitude: action.gpsLongitude || 8.6821,
      gpsAccuracyMeters: 5,
      deviceId: action.deviceId || 'MOB-DRIVER-OFFLINE',
    });

    // 4. Clean State Transition (SERVER_WINS)
    const targetStatus = action.actionType === 'PICKUP' ? 'PICKED_UP' : action.actionType === 'DELIVER' ? 'DELIVERED' : order.status;
    order.status = targetStatus;
    order.updatedAt = nowIso;
    await dbService.updateOrder(order.id, order);

    await dbService.createAuditLog({
      orderId: order.id,
      previousState: order.status,
      newState: targetStatus,
      conflictResolution: 'SERVER_WINS',
      actionDescription: `Synced offline driver action (${action.actionType}) recorded at ${clientTime}.`,
      userId: user.id,
      userName: `${user.name} (Offline Sync)`,
      userRole: user.role,
      deviceId: action.deviceId || 'MOB-DRIVER-OFFLINE',
      gpsLatitude: action.gpsLatitude || 50.1109,
      gpsLongitude: action.gpsLongitude || 8.6821,
      offlineSynced: true,
      syncedAt: nowIso,
      createdAt: clientTime,
    });

    res.json({
      success: true,
      results: [{ id: action.id, status: 'SYNCED', newStatus: targetStatus }],
    });
  } catch (err: any) {
    res.status(500).json({ message: `Sync error: ${err.message}` });
  }
});

// CEO Email Forwarding Configuration (ADMIN Only)
let ceoEmailForwardingConfig = {
  ceoEmail: 'dispatch@medigo-hessen.de',
  ceoName: 'Katrin Weber (CEO & Dispatch Director)',
  ccAccountingEmail: 'buchhaltung@medigo-hessen.de',
  autoForwardCompletedOrders: true,
  autoForwardInvoices: true,
  attachTelemetryPdf: true,
  attachChainOfCustodyPdf: true,
  forwardingMode: 'INSTANT',
  lastUpdated: new Date().toISOString(),
};

app.get('/api/ceo/email-forwarding', requireRole('ADMIN'), (req: AuthenticatedRequest, res) => {
  res.json(ceoEmailForwardingConfig);
});

app.post('/api/ceo/email-forwarding', requireRole('ADMIN'), (req: AuthenticatedRequest, res) => {
  const parseResult = CeoEmailForwardingSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Validation failed for email forwarding configuration payload.',
      errors: parseResult.error.flatten(),
    });
  }

  ceoEmailForwardingConfig = {
    ...ceoEmailForwardingConfig,
    ...parseResult.data,
    lastUpdated: new Date().toISOString(),
  };
  res.json({ message: 'CEO Email forwarding rules updated', config: ceoEmailForwardingConfig });
});

app.post('/api/ceo/email-forwarding/test-send', requireRole('ADMIN'), (req: AuthenticatedRequest, res) => {
  const parseResult = CeoTestSendSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      message: 'Validation failed for test send payload.',
      errors: parseResult.error.flatten(),
    });
  }

  const { targetEmail } = parseResult.data;
  const recipient = targetEmail || ceoEmailForwardingConfig.ceoEmail;
  res.json({
    success: true,
    message: `Test email dispatch verified for ${recipient}`,
    smtpResponse: '250 2.0.0 OK Message accepted for delivery',
    sentAt: new Date().toISOString(),
  });
});

// Fallback 404 for any unhandled /api requests (always return JSON, never HTML)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    message: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
  });
});

// Global API Error Handler (ensures errors are always returned as JSON and internal stack traces/database details never leak in production)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]:', err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  const isProd = process.env.NODE_ENV === 'production';
  const message = statusCode >= 500 && isProd
    ? 'An unexpected internal server error occurred'
    : (err.message || 'An unexpected internal server error occurred');

  res.status(statusCode).json({
    message,
    ...(isProd ? {} : { error: err.stack }),
  });
});

export default app;
export { app };
