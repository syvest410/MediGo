import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { app } from '../src/server/app';
import { dbService, generateSeedUsers } from '../src/server/db';
import {
  PasswordPolicySchema,
  ChangePasswordSchema,
  validatePasswordAgainstUser,
} from '../src/server/validation';
import { isCommonPassword } from '../src/server/commonPasswords';
import { checkLoginRateLimit, recordFailedLogin, resetFailedLogin, generateToken } from '../src/server/auth';
import { User } from '../src/types';

describe('Phase 3 Security Hardening Test Suite', () => {
  const uniqueTimestamp = Date.now();
  let seedUser: User;
  let seedToken: string;

  beforeAll(async () => {
    // Create a test user with mustChangePassword = true (simulating seed account)
    const initialPlaintext = 'InitialSeedPassword2026!Test';
    seedUser = await dbService.createUser({
      email: `mustchange.${uniqueTimestamp}@medigo-security.test`,
      password: initialPlaintext,
      name: 'Seed Doctor MustChange',
      role: 'CLIENT_CLINIC',
      phone: '+49 69 112233',
      organization: 'Klinik Hessen Test',
      contractNumber: `CTR-${uniqueTimestamp}`,
      facilityType: 'CLINIC',
      mustChangePassword: true,
    });

    // Ensure mustChangePassword flag is true
    await dbService.updateUser(seedUser.id, { mustChangePassword: true });
    seedUser.mustChangePassword = true;

    // Login to get seed token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: seedUser.email,
        password: initialPlaintext,
      });

    expect(loginRes.status).toBe(200);
    seedToken = loginRes.body.token;
  });

  // =========================================================================
  // TASK 1: SEED ACCOUNTS HARDENING
  // =========================================================================
  describe('Task 1: Seed Accounts Hardening', () => {
    it('No hardcoded password literals exist in src/server/db.ts', () => {
      const dbSource = fs.readFileSync(path.join(process.cwd(), 'src/server/db.ts'), 'utf-8');
      expect(dbSource).not.toMatch(/AdminPass2026!/);
      expect(dbSource).not.toMatch(/Dispatch2026!/);
      expect(dbSource).not.toMatch(/DriverPass2026!/);
      expect(dbSource).not.toMatch(/ClinicPass2026!/);
      expect(dbSource).not.toMatch(/LabPass2026!/);
    });

    it('generateSeedUsers() sets mustChangePassword = true on all seed accounts', () => {
      const seeds = generateSeedUsers();
      expect(seeds.length).toBeGreaterThan(0);
      for (const seed of seeds) {
        expect(seed.mustChangePassword).toBe(true);
        expect(seed.passwordHash).toBeDefined();
        // Bcrypt cost 12 hash prefix check ($2a$12$ or $2b$12$)
        expect(seed.passwordHash).toMatch(/^\$2[ab]\$12\$/);
      }
    });

    it('Bcrypt cost is 12 on user creation and seed hashes', async () => {
      const email = `cost12.${Date.now()}@medigo.test`;
      const created = await dbService.createUser({
        email,
        password: 'ValidPassword123!SecureCost12',
        name: 'Cost Test User',
        role: 'DRIVER',
        phone: '+49 171 000000',
      });

      const stored = await dbService.getUserByEmailWithPassword(email);
      expect(stored).not.toBeNull();
      expect(stored?.passwordHash).toMatch(/^\$2[ab]\$12\$/);
    });
  });

  // =========================================================================
  // TASK 2: PASSWORD POLICY & CHANGE-PASSWORD FLOW
  // =========================================================================
  describe('Task 2: Password Policy and Forced Password Change', () => {
    it('PasswordPolicySchema enforces 12 to 128 characters', () => {
      expect(PasswordPolicySchema.safeParse('Short1!').success).toBe(false);
      expect(PasswordPolicySchema.safeParse('Under12Char').success).toBe(false); // 11 chars
      expect(PasswordPolicySchema.safeParse('TwelveChars!1').success).toBe(true); // 13 chars
      expect(PasswordPolicySchema.safeParse('A'.repeat(129)).success).toBe(false);
    });

    it('PasswordPolicySchema rejects passwords from the local common passwords list', () => {
      expect(isCommonPassword('password123')).toBe(true);
      expect(isCommonPassword('password123456')).toBe(true);
      expect(isCommonPassword('sommer')).toBe(true);
      expect(PasswordPolicySchema.safeParse('password123456').success).toBe(false);
      expect(PasswordPolicySchema.safeParse('welcome123456').success).toBe(false);
      expect(PasswordPolicySchema.safeParse('stairwaytoheaven').success).toBe(false);
    });

    it('validatePasswordAgainstUser rejects password matching email or name', () => {
      const user = { email: 'martin.hoffmann@kgu.de', name: 'Dr. Martin Hoffmann' };
      
      const emailMatch = validatePasswordAgainstUser('martin.hoffmann@kgu.de', user);
      expect(emailMatch.valid).toBe(false);

      const prefixMatch = validatePasswordAgainstUser('martin.hoffmann', user);
      expect(prefixMatch.valid).toBe(false);

      const nameMatch = validatePasswordAgainstUser('Dr. Martin Hoffmann', user);
      expect(nameMatch.valid).toBe(false);

      const strongValid = validatePasswordAgainstUser('AstraGeraet2026!FrankfurtBio', user);
      expect(strongValid.valid).toBe(true);
    });

    it('While mustChangePassword is true, accessing orders or users returns 403 PASSWORD_CHANGE_REQUIRED', async () => {
      // Attempting to access protected resource with mustChangePassword = true token
      const ordersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${seedToken}`);

      expect(ordersRes.status).toBe(403);
      expect(ordersRes.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
      expect(ordersRes.body.message).toMatch(/Password change is required/);

      const usersRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${seedToken}`);

      expect(usersRes.status).toBe(403);
      expect(usersRes.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    });

    it('While mustChangePassword is true, GET /api/auth/me is permitted (returns user profile)', async () => {
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${seedToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toBeDefined();
      expect(meRes.body.user.email).toBe(seedUser.email);
    });

    it('POST /api/auth/change-password validates current password and rejects incorrect current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${seedToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword123!',
          newPassword: 'BrandNewSecurePassword2026!XYZ',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Current password is incorrect/);
    });

    it('POST /api/auth/change-password successfully clears mustChangePassword and unblocks access', async () => {
      const newStrongPassword = 'BrandNewSecurePassword2026!XYZ';

      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${seedToken}`)
        .send({
          currentPassword: 'InitialSeedPassword2026!Test',
          newPassword: newStrongPassword,
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.token).toBeDefined();
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      const newToken = changeRes.body.token;

      // Accessing protected resource with fresh token is now allowed
      const ordersRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${newToken}`);

      expect(ordersRes.status).toBe(200);
      expect(Array.isArray(ordersRes.body)).toBe(true);
    });
  });

  // =========================================================================
  // TASK 3: PERSISTENT BRUTE-FORCE PROTECTION & EXPONENTIAL LOCKOUT
  // =========================================================================
  describe('Task 3: Persistent Brute-Force & Credential Stuffing Protection', () => {
    it('app trust proxy setting is 1 for Vercel edge proxy', () => {
      expect(app.get('trust proxy')).toBe(1);
    });

    it('5 failed login attempts locks out the email', async () => {
      const targetEmail = `brute.target.${Date.now()}@medigo-security.test`;
      const testIp = `198.51.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 200 + 10)}`;

      // 4 failed attempts: still under threshold
      for (let i = 1; i <= 4; i++) {
        const attempt = await recordFailedLogin(targetEmail, testIp);
        expect(attempt.locked).toBe(false);
        expect(attempt.attemptsLeft).toBe(5 - i);
      }

      // 5th failed attempt: triggers lockout
      const fifth = await recordFailedLogin(targetEmail, testIp);
      expect(fifth.locked).toBe(true);
      expect(fifth.attemptsLeft).toBe(0);

      // checkLoginRateLimit reports blocked
      const check = await checkLoginRateLimit(targetEmail, testIp);
      expect(check.allowed).toBe(false);
      expect(check.remainingLockoutSeconds).toBeGreaterThan(0);
    });

    it('Exponential lockout escalates duration with subsequent failed attempts', async () => {
      const targetEmail = `exponential.${Date.now()}@medigo.test`;
      const testIp = `198.51.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 200 + 10)}`;

      // Attempts 1-4: not locked
      for (let i = 0; i < 4; i++) {
        await recordFailedLogin(targetEmail, testIp);
      }

      // Attempt 5 (1st lockout): 1 minute = 60s
      const firstLockout = await recordFailedLogin(targetEmail, testIp);
      expect(firstLockout.locked).toBe(true);
      expect(firstLockout.remainingLockoutSeconds).toBe(60);

      // Attempt 6 (2nd lockout): 2 minutes = 120s
      const secondLockout = await recordFailedLogin(targetEmail, testIp);
      expect(secondLockout.locked).toBe(true);
      expect(secondLockout.remainingLockoutSeconds).toBe(120);

      // Attempt 7 (3rd lockout): 4 minutes = 240s
      const thirdLockout = await recordFailedLogin(targetEmail, testIp);
      expect(thirdLockout.locked).toBe(true);
      expect(thirdLockout.remainingLockoutSeconds).toBe(240);
    });

    it('Successful login clears ONLY the email counter while IP failures remain tracked', async () => {
      const userEmail = `ip.preservation.${Date.now()}@medigo.test`;
      const ip = `198.51.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 200 + 10)}`;
      await dbService.clearLoginAttempt(`ip:${ip}`);
      await dbService.clearLoginAttempt(`email:${userEmail}`);

      // Record 2 failures for email and IP
      await recordFailedLogin(userEmail, ip);
      await recordFailedLogin(userEmail, ip);

      // Successful login resets email counter
      await resetFailedLogin(userEmail);

      const emailAttempt = await dbService.getLoginAttempt(`email:${userEmail}`);
      expect(emailAttempt).toBeNull();

      const ipAttempt = await dbService.getLoginAttempt(`ip:${ip}`);
      expect(ipAttempt).not.toBeNull();
      expect(ipAttempt?.attempts).toBe(2);
    });
  });

  // =========================================================================
  // TASK 4: TIMING ATTACK & ERROR UNIFORMITY
  // =========================================================================
  describe('Task 4: Anti-Timing Attacks & Uniform Error Responses', () => {
    it('Login failure returns uniform message without leaking remaining attempts or existence', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'completely.nonexistent.user.12345@medigo.test',
          password: 'SomeRandomPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password.');
      expect(res.body.attemptsLeft).toBeUndefined();
      expect(res.body.remainingAttempts).toBeUndefined();
    });

    it('Incorrect password for existing user returns identical uniform error message', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: seedUser.email,
          password: 'IncorrectPasswordAttempt123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password.');
      expect(res.body.attemptsLeft).toBeUndefined();
    });
  });

  // =========================================================================
  // TASK 5: HTTP HYGIENE & HEADERS (HELMET, CORS, BODY LIMITS)
  // =========================================================================
  describe('Task 5: HTTP Hygiene, Helmet, CORS, and Payload Limits', () => {
    it('Helmet security headers are present on responses', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('Requests exceeding 100kb on standard endpoints are rejected with 413 Payload Too Large', async () => {
      const largePayload = {
        email: 'large.payload@medigo.test',
        password: 'A'.repeat(110 * 1024), // 110 KB payload
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(largePayload);

      expect(res.status).toBe(413);
    });
  });
});
