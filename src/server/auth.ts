import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, Role } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'medigo-un3373-jwt-secret-key-2026-prod';

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  contractNumber?: string;
  organization?: string;
  vehicleRegNumber?: string;
  facilityType?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(user: User): string {
  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    contractNumber: user.contractNumber,
    organization: user.organization,
    vehicleRegNumber: user.vehicleRegNumber,
    facilityType: user.facilityType,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Missing Bearer token.' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: 'Invalid or expired session token. Please sign in again.' });
  }

  req.user = decoded;
  next();
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

// Brute-force & Credential Stuffing Protection (Least Privilege login principle)
interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes lockout

export function checkLoginRateLimit(identifier: string): { allowed: boolean; remainingLockoutSeconds?: number } {
  const key = identifier.toLowerCase().trim();
  const record = loginAttempts.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil && now < record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingLockoutSeconds: remaining };
  }

  // Reset if window has elapsed
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(identifier: string): { attemptsLeft: number; locked: boolean } {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const record = loginAttempts.get(key) || { attempts: 0, firstAttempt: now };

  record.attempts += 1;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    loginAttempts.set(key, record);
    return { attemptsLeft: 0, locked: true };
  }

  loginAttempts.set(key, record);
  return { attemptsLeft: MAX_FAILED_ATTEMPTS - record.attempts, locked: false };
}

export function resetFailedLogin(identifier: string) {
  const key = identifier.toLowerCase().trim();
  loginAttempts.delete(key);
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}
