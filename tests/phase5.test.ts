import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/server/app';
import { dbService } from '../src/server/db';
import { JWT_ISSUER, JWT_AUDIENCE, REFRESH_COOKIE_NAME } from '../src/server/auth';
import { User } from '../src/types';

describe('Phase 5 Security Verification & Regression Matrix', () => {
  const testTimestamp = Date.now();
  const testPassword = 'SecurePhase5Password2026!#';
  let testUser: User;
  let testUserToken: string;

  beforeAll(async () => {
    testUser = await dbService.createUser({
      email: `security.auditor.${testTimestamp}@medigo-security.test`,
      password: testPassword,
      name: 'Phase 5 Security Auditor',
      role: 'DRIVER',
      phone: '+49 170 998877',
      organization: 'MediGo Central Fleet',
      facilityType: 'COURIER',
      mustChangePassword: false,
      tokenVersion: 0,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testPassword });

    testUserToken = loginRes.body.accessToken;
  });

  // 1. Insecure CORS Wildcard Domain Protection
  describe('1. CORS Origin Enforcement (Rejecting Arbitrary .vercel.app Attackers)', () => {
    it('Rejects arbitrary attacker-controlled .vercel.app domain', async () => {
      const attackerOrigin = 'https://evil-phishing-attacker.vercel.app';
      const res = await request(app)
        .options('/api/auth/me')
        .set('Origin', attackerOrigin)
        .set('Access-Control-Request-Method', 'GET');

      // The CORS middleware should NOT reflect the malicious attacker origin
      const allowOrigin = res.headers['access-control-allow-origin'];
      expect(allowOrigin).not.toBe(attackerOrigin);
    });

    it('Allows legitimate application origin', async () => {
      const legitimateOrigin = 'http://localhost:3000';
      const res = await request(app)
        .options('/api/auth/me')
        .set('Origin', legitimateOrigin)
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-origin']).toBe(legitimateOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  // 2. CSRF Origin Validation (Rejecting Arbitrary .vercel.app Attackers)
  describe('2. CSRF Origin Enforcement on Refresh, Logout, and Password Change', () => {
    const maliciousVercelOrigin = 'https://phishing-scam.vercel.app';

    it('POST /api/auth/refresh rejects malicious vercel origin with 403', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Origin', maliciousVercelOrigin);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_ORIGIN_DENIED');
    });

    it('POST /api/auth/logout rejects malicious vercel origin with 403', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Origin', maliciousVercelOrigin);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_ORIGIN_DENIED');
    });

    it('POST /api/auth/change-password rejects malicious vercel origin with 403', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Origin', maliciousVercelOrigin)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'BrandNewPassword2026!#Strong',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_ORIGIN_DENIED');
    });
  });

  // 3. Strict tokenVersion enforcement in optionalAuth
  describe('3. Strict tokenVersion Enforcement in optionalAuth', () => {
    it('Token missing tokenVersion is NOT accepted as authenticated user on optionalAuth routes', async () => {
      // Craft a token signed with the real secret but omitting tokenVersion
      const legacyToken = jwt.sign(
        { sub: testUser.id, role: testUser.role, email: testUser.email },
        process.env.JWT_SECRET!,
        {
          algorithm: 'HS256',
          issuer: JWT_ISSUER,
          audience: JWT_AUDIENCE,
          expiresIn: '15m',
        }
      );

      const res = await request(app)
        .get('/api/db/status')
        .set('Authorization', `Bearer ${legacyToken}`);

      expect(res.status).toBe(200);
      // Because tokenVersion is missing, optionalAuth ignores the token,
      // so the user is treated as anonymous and sensitive DB info is NOT revealed
      expect(res.body.supabaseUrl).toBeUndefined();
      expect(res.body.userCount).toBeUndefined();
    });
  });

  // 4. Login Input Validation & Type Confusion Protection
  describe('4. Login Input Schema Validation', () => {
    it('Rejects non-string email/password without throwing uncaught 500 error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $ne: null }, password: ['malicious', 'array'] });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Email and password are required/i);
    });

    it('Rejects malformed email string format with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'ValidPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Email and password are required/i);
    });
  });

  // 5. Per-Route Anonymous Access Control Matrix (from docs/ROUTE_AUDIT.md)
  describe('5. Comprehensive Route Audit Anonymous Matrix', () => {
    const anonymousAccessMatrix: Array<{
      method: 'get' | 'post' | 'patch' | 'put' | 'delete';
      path: string;
      body?: any;
      expectedStatus: number;
      label: string;
    }> = [
      { method: 'get', path: '/api/health', expectedStatus: 200, label: 'Health Check' },
      { method: 'get', path: '/api/db/status', expectedStatus: 200, label: 'Database Status (Sanitized for Anon)' },
      { method: 'get', path: '/api/db/schema-sql', expectedStatus: 401, label: 'Database Schema DDL' },
      { method: 'get', path: '/api/auth/me', expectedStatus: 401, label: 'Current Session User' },
      { method: 'post', path: '/api/auth/change-password', body: {}, expectedStatus: 401, label: 'Change Password' },
      { method: 'post', path: '/api/auth/logout-all', body: {}, expectedStatus: 401, label: 'Logout All Sessions' },
      { method: 'get', path: '/api/organizations', expectedStatus: 401, label: 'Organizations Directory' },
      { method: 'post', path: '/api/organizations', body: {}, expectedStatus: 401, label: 'Create Organization' },
      { method: 'get', path: '/api/users', expectedStatus: 401, label: 'User Directory' },
      { method: 'get', path: '/api/users/user-123', expectedStatus: 401, label: 'Get User by ID' },
      { method: 'post', path: '/api/users', body: {}, expectedStatus: 401, label: 'Create User' },
      { method: 'patch', path: '/api/users/user-123', body: {}, expectedStatus: 401, label: 'Patch User' },
      { method: 'delete', path: '/api/users/user-123', expectedStatus: 401, label: 'Delete User' },
      { method: 'get', path: '/api/orders', expectedStatus: 401, label: 'Orders List' },
      { method: 'get', path: '/api/orders/order-999', expectedStatus: 401, label: 'Order by ID' },
      { method: 'get', path: '/api/orders/track/NONEXISTENT-TRACKING', expectedStatus: 404, label: 'Public Tracking' },
      { method: 'post', path: '/api/orders', body: {}, expectedStatus: 401, label: 'Create Order' },
      { method: 'post', path: '/api/orders/order-999/transition', body: {}, expectedStatus: 401, label: 'Order State Transition' },
      { method: 'post', path: '/api/orders/order-999/claim', body: {}, expectedStatus: 401, label: 'Claim Order' },
      { method: 'patch', path: '/api/orders/order-999', body: {}, expectedStatus: 401, label: 'Patch Order' },
      { method: 'post', path: '/api/orders/order-999/pre-trip-check', body: {}, expectedStatus: 401, label: 'Pre-Trip Inspection' },
      { method: 'post', path: '/api/orders/order-999/chain-of-custody', body: {}, expectedStatus: 401, label: 'Chain of Custody' },
      { method: 'post', path: '/api/orders/order-999/temperature', body: {}, expectedStatus: 401, label: 'Temperature Telemetry' },
      { method: 'get', path: '/api/audit-logs', expectedStatus: 401, label: 'Compliance Audit Logs' },
      { method: 'post', path: '/api/v1/sync', body: {}, expectedStatus: 401, label: 'Offline Sync v1' },
      { method: 'post', path: '/api/sync', body: {}, expectedStatus: 401, label: 'Offline Sync Root' },
      { method: 'post', path: '/api/sync-offline', body: {}, expectedStatus: 401, label: 'Offline Sync Alias' },
      { method: 'get', path: '/api/ceo/email-forwarding', expectedStatus: 401, label: 'CEO Email Forwarding Config' },
      { method: 'post', path: '/api/ceo/email-forwarding', body: {}, expectedStatus: 401, label: 'Update CEO Email Config' },
      { method: 'post', path: '/api/ceo/email-forwarding/test-send', body: {}, expectedStatus: 401, label: 'Test Send CEO Email' },
      { method: 'get', path: '/api/nonexistent-route', expectedStatus: 404, label: 'Unmapped API Route 404' },
    ];

    for (const testCase of anonymousAccessMatrix) {
      it(`Anonymous [${testCase.method.toUpperCase()}] ${testCase.path} -> HTTP ${testCase.expectedStatus} (${testCase.label})`, async () => {
        let reqBuilder = request(app)[testCase.method](testCase.path);
        if (testCase.body) {
          reqBuilder = reqBuilder.send(testCase.body);
        }
        const res = await reqBuilder;
        expect(res.status).toBe(testCase.expectedStatus);
      });
    }
  });

  // 6. Global Error Handler Sanitization
  describe('6. Error Response Sanitization', () => {
    it('Unhandled 404 route returns JSON with no internal stack trace', async () => {
      const res = await request(app).get('/api/unknown/endpoint/path');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeUndefined();
      expect(typeof res.body.message).toBe('string');
    });
  });
});
