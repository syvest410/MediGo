import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { User, Role, LoginAttemptRecord } from '../types';
import { dbService } from './db';

dotenv.config();

export const JWT_ISSUER = 'medigo-auth';
export const JWT_AUDIENCE = 'medigo-api';
export const REFRESH_COOKIE_NAME = 'medigo_refresh_token';

// Precomputed bcrypt cost 12 dummy hash for constant-time comparisons when email does not exist
export const DUMMY_HASH = bcrypt.hashSync('Dummy_Anti_Timing_Enumeration_Salt_2026!#', 12);

export function validateJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    const errorMsg = '[FATAL SECURITY ERROR] JWT_SECRET environment variable is missing or shorter than 32 characters.';
    console.error(errorMsg);
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      process.exit(1);
    }
    throw new Error(errorMsg);
  }
  return secret;
}

// Throw and exit immediately at startup/import if JWT_SECRET is invalid
export const JWT_SECRET = validateJwtSecret();

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  organizationId?: string;
  tokenVersion: number;
}

export interface TokenPayload {
  id: string;
  sub: string;
  email: string;
  name: string;
  role: Role;
  contractNumber?: string;
  organization?: string;
  organizationId?: string;
  vehicleRegNumber?: string;
  facilityType?: string;
  facilityAddress?: string;
  mustChangePassword?: boolean;
  tokenVersion: number;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  if (!plainText || !hash || typeof plainText !== 'string' || typeof hash !== 'string') {
    return false;
  }
  try {
    return await bcrypt.compare(plainText, hash);
  } catch (err) {
    console.error('[Auth] Error in comparePassword:', err);
    return false;
  }
}

/**
 * Access token: JWT HS256, 15 minute expiry,
 * payload only { sub: userId, role, organizationId, tokenVersion }, plus issuer and audience.
 */
export function generateToken(user: User): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    organizationId: user.organizationId,
    tokenVersion: user.tokenVersion ?? 0,
  };

  return jwt.sign(payload, validateJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, validateJwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as any;
  } catch (err) {
    return null;
  }
}

export function generateRawRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function getRefreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };
}

/**
 * CSRF origin validation: refresh, logout, and logout-all reject requests
 * whose Origin (or Referer if no Origin) does not match APP_URL, with 403.
 */
export function validateCsrfOrigin(req: Request, res: Response, next: NextFunction) {
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let requestOrigin: string | null = null;
  if (originHeader) {
    requestOrigin = originHeader.trim().toLowerCase();
  } else if (refererHeader) {
    try {
      requestOrigin = new URL(refererHeader).origin.toLowerCase();
    } catch {
      requestOrigin = null;
    }
  }

  const appUrl = process.env.APP_URL;
  const validOrigins = new Set<string>();
  if (appUrl) {
    try {
      validOrigins.add(new URL(appUrl).origin.toLowerCase());
    } catch {
      validOrigins.add(appUrl.toLowerCase().trim());
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    validOrigins.add('http://localhost:3000');
    validOrigins.add('http://localhost:5173');
    validOrigins.add('http://127.0.0.1:3000');
    validOrigins.add('http://127.0.0.1:5173');
  }

  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  if (allowedOriginsEnv) {
    allowedOriginsEnv.split(',').forEach(o => {
      try {
        validOrigins.add(new URL(o).origin.toLowerCase());
      } catch {
        const trimmed = o.trim().toLowerCase();
        if (trimmed) validOrigins.add(trimmed);
      }
    });
  }

  // Include VERCEL_URL if set by deployment platform (specific to this deployment, not arbitrary vercel apps)
  if (process.env.VERCEL_URL) {
    validOrigins.add(`https://${process.env.VERCEL_URL.toLowerCase().trim()}`);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    validOrigins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.toLowerCase().trim()}`);
  }
  validOrigins.add('https://aistudio.google.com');

  if (requestOrigin) {
    const isAllowed =
      validOrigins.has(requestOrigin) ||
      (requestOrigin.endsWith('.run.app') && (requestOrigin.includes('ais-dev-') || requestOrigin.includes('ais-pre-')));
    if (!isAllowed) {
      return res.status(403).json({
        code: 'CSRF_ORIGIN_DENIED',
        message: 'Forbidden: Request origin does not match allowed application domain.',
      });
    }
  }

  next();
}

/**
 * Middleware: While mustChangePassword is true, every route except change-password
 * and /api/auth/me must return 403 with code PASSWORD_CHANGE_REQUIRED.
 */
export function enforcePasswordChange(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user && req.user.mustChangePassword) {
    const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : (req.path || req.originalUrl || '');
    const cleanPath = rawPath.split('?')[0];
    if (
      cleanPath === '/api/auth/change-password' ||
      cleanPath === '/api/auth/me' ||
      cleanPath.endsWith('/api/auth/change-password') ||
      cleanPath.endsWith('/api/auth/me')
    ) {
      return next();
    }
    return res.status(403).json({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Password change is required before accessing other resources.',
    });
  }
  next();
}

/**
 * requireAuth loads the user per request, validates active === true, and verifies tokenVersion.
 * Role and organizationId are read from the DB user, not trusting token claims for authorization.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Authentication required. Missing Bearer token.' });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired session token. Please sign in again.' });
  }

  const userId = decoded.sub || decoded.id;
  if (!userId) {
    return res.status(401).json({ message: 'Invalid or expired session token. Please sign in again.' });
  }

  // Load fresh user from database per request
  const dbUser = await dbService.getUserById(userId);
  if (!dbUser) {
    return res.status(401).json({ message: 'User not found or session revoked. Please sign in again.' });
  }

  if (dbUser.active === false) {
    return res.status(401).json({ message: 'Account is deactivated. Please contact your dispatch administrator.' });
  }

  const expectedTokenVersion = dbUser.tokenVersion ?? 0;
  if (decoded.tokenVersion === undefined || decoded.tokenVersion !== expectedTokenVersion) {
    return res.status(401).json({ message: 'Session token has been revoked or invalidated. Please sign in again.' });
  }

  // Authoritative user context populated from DB user (not trusting token claims for authorization)
  req.user = {
    id: dbUser.id,
    sub: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organization: dbUser.organization,
    organizationId: dbUser.organizationId,
    contractNumber: dbUser.contractNumber,
    vehicleRegNumber: dbUser.vehicleRegNumber,
    facilityType: dbUser.facilityType,
    facilityAddress: dbUser.facilityAddress,
    mustChangePassword: Boolean(dbUser.mustChangePassword),
    tokenVersion: expectedTokenVersion,
  };

  enforcePasswordChange(req, res, next);
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DISPATCHER')) {
      return res.status(403).json({
        message: 'Forbidden: Only authorized Administrators and Dispatchers can perform this action.',
      });
    }
    next();
  });
}

/**
 * Enforces Principle of Least Privilege: only allowed roles may access the route.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          message: `Forbidden: Least Privilege violation. Role '${req.user?.role || 'ANONYMOUS'}' does not have permission to perform this action. Required role(s): ${allowedRoles.join(', ')}.`,
          userRole: req.user?.role,
          requiredRoles: allowedRoles,
        });
      }
      next();
    });
  };
}

// ====================================================================
// PERSISTENT BRUTE-FORCE & CREDENTIAL STUFFING DEFENSE
// Limits:
//   - Per email: 5 failures per 15 min
//   - Per IP: 20 failures per 15 min
//   - Exponential lockout: 1, 2, 4, 8, 16, 32... up to 60 minutes
//   - Successful login clears ONLY the email counter (IP remains tracked)
// ====================================================================

const MAX_EMAIL_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 20;
const WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window

// In-memory fallback if persistence fails or in local dev
const memoryFallbackStore = new Map<string, LoginAttemptRecord>();

async function getStoredAttempt(key: string): Promise<LoginAttemptRecord | null> {
  try {
    const record = await dbService.getLoginAttempt(key);
    if (record) return record;
  } catch (err) {
    console.warn('[RateLimit] Database lookup failed, falling back to memory:', err);
  }
  return memoryFallbackStore.get(key) || null;
}

async function saveStoredAttempt(record: LoginAttemptRecord): Promise<void> {
  memoryFallbackStore.set(record.key, record);
  try {
    await dbService.upsertLoginAttempt(record);
  } catch (err) {
    console.warn('[RateLimit] Database upsert failed, preserved in memory:', err);
  }
}

async function deleteStoredAttempt(key: string): Promise<void> {
  memoryFallbackStore.delete(key);
  try {
    await dbService.clearLoginAttempt(key);
  } catch (err) {
    console.warn('[RateLimit] Database delete failed:', err);
  }
}

function calculateExponentialLockoutMinutes(attempts: number, maxAttempts: number): number {
  const excess = Math.max(0, attempts - maxAttempts);
  // 2^0 = 1 min, 2^1 = 2 min, 2^2 = 4 min, 2^3 = 8 min, ..., cap at 60 min
  const minutes = Math.min(60, Math.pow(2, excess));
  return minutes;
}

export async function checkLoginRateLimit(
  email: string,
  ip?: string
): Promise<{ allowed: boolean; remainingLockoutSeconds?: number; reason?: 'EMAIL' | 'IP' }> {
  const now = Date.now();
  const keys: { key: string; type: 'EMAIL' | 'IP' }[] = [];

  if (email) {
    keys.push({ key: `email:${email.toLowerCase().trim()}`, type: 'EMAIL' });
  }
  const cleanIp = (ip || '127.0.0.1').trim();
  if (cleanIp) {
    keys.push({ key: `ip:${cleanIp}`, type: 'IP' });
  }

  for (const { key, type } of keys) {
    const record = await getStoredAttempt(key);
    if (!record) continue;

    if (record.lockedUntil) {
      const lockedUntilTime = new Date(record.lockedUntil).getTime();
      if (now < lockedUntilTime) {
        const remaining = Math.ceil((lockedUntilTime - now) / 1000);
        return { allowed: false, remainingLockoutSeconds: remaining, reason: type };
      }
    }

    // Reset if window has completely elapsed without lockout
    const firstAttemptTime = new Date(record.firstAttemptAt).getTime();
    if (now - firstAttemptTime > WINDOW_MS && (!record.lockedUntil || now >= new Date(record.lockedUntil).getTime())) {
      await deleteStoredAttempt(key);
    }
  }

  return { allowed: true };
}

export async function recordFailedLogin(
  email: string,
  ip?: string
): Promise<{ attemptsLeft: number; locked: boolean; remainingLockoutSeconds?: number }> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  let isLockedOverall = false;
  let maxLockoutSeconds = 0;
  let emailAttemptsLeft = MAX_EMAIL_ATTEMPTS;

  const entries: { key: string; type: 'EMAIL' | 'IP'; identifier: string; max: number }[] = [];

  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail) {
    entries.push({ key: `email:${cleanEmail}`, type: 'EMAIL', identifier: cleanEmail, max: MAX_EMAIL_ATTEMPTS });
  }
  const cleanIp = (ip || '127.0.0.1').trim();
  if (cleanIp) {
    entries.push({ key: `ip:${cleanIp}`, type: 'IP', identifier: cleanIp, max: MAX_IP_ATTEMPTS });
  }

  for (const entry of entries) {
    let record = await getStoredAttempt(entry.key);

    if (!record || (now - new Date(record.firstAttemptAt).getTime() > WINDOW_MS && (!record.lockedUntil || now >= new Date(record.lockedUntil).getTime()))) {
      record = {
        id: `RL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        key: entry.key,
        type: entry.type,
        identifier: entry.identifier,
        attempts: 0,
        firstAttemptAt: nowIso,
        lockoutDurationMinutes: 0,
        updatedAt: nowIso,
      };
    }

    record.attempts += 1;
    record.updatedAt = nowIso;

    if (record.attempts >= entry.max) {
      const lockoutMinutes = calculateExponentialLockoutMinutes(record.attempts, entry.max);
      record.lockoutDurationMinutes = lockoutMinutes;
      const lockoutUntilMs = now + lockoutMinutes * 60 * 1000;
      record.lockedUntil = new Date(lockoutUntilMs).toISOString();

      isLockedOverall = true;
      maxLockoutSeconds = Math.max(maxLockoutSeconds, lockoutMinutes * 60);

      if (entry.type === 'EMAIL') {
        emailAttemptsLeft = 0;
      }
    } else if (entry.type === 'EMAIL') {
      emailAttemptsLeft = entry.max - record.attempts;
    }

    await saveStoredAttempt(record);
  }

  return {
    attemptsLeft: emailAttemptsLeft,
    locked: isLockedOverall,
    remainingLockoutSeconds: maxLockoutSeconds > 0 ? maxLockoutSeconds : undefined,
  };
}

/**
 * Successful login resets ONLY the email counter.
 * The IP counter is intentionally preserved so rotating accounts across the same IP cannot bypass limits.
 */
export async function resetFailedLogin(email: string): Promise<void> {
  const key = `email:${email.toLowerCase().trim()}`;
  await deleteStoredAttempt(key);
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    const decoded = verifyToken(token);
    if (decoded) {
      const userId = decoded.sub || decoded.id;
      if (userId) {
        try {
          const dbUser = await dbService.getUserById(userId);
          if (dbUser && dbUser.active !== false && decoded.tokenVersion !== undefined && decoded.tokenVersion === (dbUser.tokenVersion ?? 0)) {
            req.user = {
              id: dbUser.id,
              sub: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
              organization: dbUser.organization,
              organizationId: dbUser.organizationId,
              contractNumber: dbUser.contractNumber,
              vehicleRegNumber: dbUser.vehicleRegNumber,
              facilityType: dbUser.facilityType,
              facilityAddress: dbUser.facilityAddress,
              mustChangePassword: Boolean(dbUser.mustChangePassword),
              tokenVersion: dbUser.tokenVersion ?? 0,
            };
          }
        } catch {
          // ignore in optional auth
        }
      }
    }
  }
  next();
}
