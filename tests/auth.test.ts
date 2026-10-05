import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import { app } from '../src/server/app';
import { dbService } from '../src/server/db';
import { validateJwtSecret, JWT_ISSUER, JWT_AUDIENCE, TokenPayload } from '../src/server/auth';
import { User } from '../src/types';

describe('Security & Authentication Test Suite', () => {
  let testUser: User;
  const testEmail = `test.runner.${Date.now()}@medigo-security.test`;
  const testPassword = 'StrongPassword2026!Secure';

  beforeAll(async () => {
    // Create an isolated non-seed test user specifically for the test suite
    testUser = await dbService.createUser({
      email: testEmail,
      password: testPassword,
      name: 'Automated Security Test User',
      role: 'DRIVER',
      phone: '+49 69 998877',
      organization: 'Security Test Fleet',
      vehicleRegNumber: 'WI-SEC 9901',
    });
  });

  // 1. POST /api/auth/quick-session returns 404
  describe('1. Quick-session removal verification', () => {
    it('POST /api/auth/quick-session returns 404', async () => {
      const res = await request(app)
        .post('/api/auth/quick-session')
        .send({ role: 'ADMIN', email: 'nsansvester89@gmail.com' });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/API route not found/);
    });
  });

  // 2. Server module refuses to load without JWT_SECRET, and with a 31-character one
  describe('2. JWT_SECRET enforcement (refusal to load without 32+ char secret)', () => {
    it('validateJwtSecret throws error when JWT_SECRET is missing', () => {
      const original = process.env.JWT_SECRET;
      try {
        delete process.env.JWT_SECRET;
        expect(() => validateJwtSecret()).toThrow(
          /JWT_SECRET environment variable is missing or shorter than 32 characters/
        );
      } finally {
        process.env.JWT_SECRET = original;
      }
    });

    it('validateJwtSecret throws error when JWT_SECRET has exactly 31 characters', () => {
      const original = process.env.JWT_SECRET;
      try {
        process.env.JWT_SECRET = '1234567890123456789012345678901'; // exactly 31 chars
        expect(() => validateJwtSecret()).toThrow(
          /JWT_SECRET environment variable is missing or shorter than 32 characters/
        );
      } finally {
        process.env.JWT_SECRET = original;
      }
    });

    it('Server auth module refuses to load in subprocess without JWT_SECRET', () => {
      expect(() => {
        execSync('npx tsx -e "delete process.env.JWT_SECRET; import(\'./src/server/auth\')"', {
          stdio: 'pipe',
          env: { ...process.env, JWT_SECRET: '', NODE_ENV: 'production' },
        });
      }).toThrow();
    });

    it('Server auth module refuses to load in subprocess with a 31-character secret', () => {
      expect(() => {
        execSync('npx tsx -e "import(\'./src/server/auth\')"', {
          stdio: 'pipe',
          env: {
            ...process.env,
            JWT_SECRET: '1234567890123456789012345678901',
            NODE_ENV: 'production',
          },
        });
      }).toThrow();
    });
  });

  // 3. GET /api/auth/me without a token returns 401
  describe('3. Unauthenticated access enforcement', () => {
    it('GET /api/auth/me without a token returns 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/);
    });

    it('GET /api/auth/me with invalid authorization header prefix returns 401', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Basic invalid-token');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/);
    });
  });

  // 4. Token validation: different secret, alg "none", and wrong issuer/audience rejected
  describe('4. Token signature and claims validation', () => {
    it('Token signed with a different secret is rejected (401)', async () => {
      const differentSecret = 'completely-unauthorized-secret-with-at-least-32-chars!';
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email, role: testUser.role },
        differentSecret,
        {
          algorithm: 'HS256',
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          expiresIn: '1h',
        }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired session token/);
    });

    it('Token with algorithm "none" is rejected (401)', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
          iss: JWT_ISSUER,
          aud: JWT_AUDIENCE,
        })
      ).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${noneToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired session token/);
    });

    it('Token with wrong issuer is rejected (401)', async () => {
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET!,
        {
          algorithm: 'HS256',
          issuer: 'rogue-untrusted-issuer',
          audience: JWT_AUDIENCE,
          expiresIn: '1h',
        }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired session token/);
    });

    it('Token with wrong audience is rejected (401)', async () => {
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET!,
        {
          algorithm: 'HS256',
          issuer: JWT_ISSUER,
          audience: 'third-party-external-api',
          expiresIn: '1h',
        }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired session token/);
    });
  });

  // 5. A valid login still works (using created test user, not seeds)
  describe('5. Valid authentication flow', () => {
    it('Valid login works with newly created test user and returns JWT + user payload', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
      expect(typeof loginRes.body.token).toBe('string');
      expect(loginRes.body.user).toBeDefined();
      expect(loginRes.body.user.email).toBe(testEmail);
      expect(loginRes.body.user.role).toBe('DRIVER');

      // Verify the generated token accesses protected endpoint
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toBeDefined();
      expect(meRes.body.user.email).toBe(testEmail);
      expect(meRes.body.user.name).toBe('Automated Security Test User');
    });

    it('Invalid password for created test user returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Invalid email or password/);
    });
  });
});
