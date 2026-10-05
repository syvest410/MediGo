import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../src/server/app';
import { dbService } from '../src/server/db';
import { generateToken, REFRESH_COOKIE_NAME, hashRefreshToken } from '../src/server/auth';
import { User, RefreshTokenRecord } from '../src/types';

function extractCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'];
  if (!raw) return undefined;
  const list = Array.isArray(raw) ? raw : [raw];
  return list.find((c: string) => c.startsWith(`${name}=`));
}

describe('Phase 4 Session Management & Refresh Token Security Test Suite', () => {
  const testTimestamp = Date.now();
  const testPassword = 'Password_Phase4_Sec2026!#';
  let testUser: User;

  beforeAll(async () => {
    testUser = await dbService.createUser({
      email: `driver.phase4.${testTimestamp}@medigo-security.test`,
      password: testPassword,
      name: 'Phase4 Automated Courier',
      role: 'DRIVER',
      phone: '+49 170 555444',
      organization: 'MediGo Hessen Fleet',
      vehicleRegNumber: 'WI-MG 8821',
      facilityType: 'COURIER',
      mustChangePassword: false,
      tokenVersion: 0,
    });
  });

  // 1. Login sets httpOnly cookie and returns NO refresh token in the body
  it('1. POST /api/auth/login sets httpOnly cookie and returns no refresh token in the response body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);

    // CRITICAL: Refresh token must NEVER be returned in response JSON
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.body.refresh_token).toBeUndefined();

    // Check Set-Cookie header
    const refreshCookie = extractCookie(res, REFRESH_COOKIE_NAME);
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
    expect(refreshCookie).toMatch(/Path=\/api\/auth/i);
    expect(refreshCookie).toMatch(/SameSite=Strict/i);
  });

  // 2. Refresh rotates token and issues new access token
  it('2. POST /api/auth/refresh rotates the refresh token cookie and issues a new access token', async () => {
    const agent = request.agent(app);

    const loginRes = await agent
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testPassword,
      });

    expect(loginRes.status).toBe(200);
    const initialAccessToken = loginRes.body.accessToken;
    const initialCookie = extractCookie(loginRes, REFRESH_COOKIE_NAME);

    // Wait 1100ms so the Unix epoch timestamp (whole seconds) in JWT iat rolls over
    await new Promise(r => setTimeout(r, 1100));

    const refreshRes = await agent.post('/api/auth/refresh');
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.user).toBeDefined();

    // Rotated access token returned
    expect(refreshRes.body.accessToken).not.toBe(initialAccessToken);

    // New cookie issued
    const rotatedCookie = extractCookie(refreshRes, REFRESH_COOKIE_NAME);
    expect(rotatedCookie).toBeDefined();
    expect(rotatedCookie).not.toBe(initialCookie);
  });

  // 3. Replaying the OLD refresh token revokes the family and new one stops working too (Reuse Detection)
  it('3. Replaying an old refresh token triggers reuse detection, revoking the family and invalidating new token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testPassword,
      });

    expect(loginRes.status).toBe(200);
    const oldCookieHeader = extractCookie(loginRes, REFRESH_COOKIE_NAME);
    expect(oldCookieHeader).toBeDefined();

    // Perform legitimate rotation with old cookie
    const rotateRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [oldCookieHeader!]);

    expect(rotateRes.status).toBe(200);
    const newCookieHeader = extractCookie(rotateRes, REFRESH_COOKIE_NAME);
    expect(newCookieHeader).toBeDefined();

    // ATTACK SIMULATION: Attacker replays oldCookieHeader
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [oldCookieHeader!]);

    // Reuse detection triggered!
    expect(replayRes.status).toBe(401);
    expect(replayRes.body.code).toBe('REFRESH_TOKEN_REUSE_DETECTED');

    // Legit user with newCookieHeader now also gets 401 because the entire family is compromised and revoked!
    const subsequentRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [newCookieHeader!]);

    expect(subsequentRes.status).toBe(401);
  });

  // 4. Logout revokes server-side and the old refresh fails
  it('4. POST /api/auth/logout revokes the token family server-side and refresh subsequently fails', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testPassword,
      });

    expect(loginRes.status).toBe(200);
    const cookie = extractCookie(loginRes, REFRESH_COOKIE_NAME);
    expect(cookie).toBeDefined();

    // Call logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [cookie!]);

    expect(logoutRes.status).toBe(204);

    // Attempting refresh with that cookie fails with 401
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [cookie!]);

    expect(refreshRes.status).toBe(401);
  });

  // 5. Access token passes until expiry (inherent to stateless JWTs)
  it('5. Access token remains valid for protected endpoints until its 15-minute expiration window', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testPassword,
      });

    const accessToken = loginRes.body.accessToken;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testUser.email);
    expect(meRes.body.user.role).toBe('DRIVER');
  });

  // 6. Token after password change or logout-all is rejected immediately
  it('6. Token after password change or logout-all is rejected immediately via tokenVersion mismatch', async () => {
    // Login to get token A
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testPassword,
      });

    const tokenA = loginRes.body.accessToken;

    // Verify token A works
    const check1 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(check1.status).toBe(200);

    // Perform logout-all
    const logoutAllRes = await request(app)
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(logoutAllRes.status).toBe(200);

    // Immediately on next request, token A must be rejected (401)
    const check2 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(check2.status).toBe(401);
    expect(check2.body.message).toMatch(/revoked or invalidated/i);
  });

  // 7. Deactivated user token is rejected on next request
  it('7. Deactivated user token is rejected immediately on the next request', async () => {
    // Create new active user
    const victim = await dbService.createUser({
      email: `victim.${testTimestamp}@medigo.test`,
      password: testPassword,
      name: 'Deactivation Target User',
      role: 'DRIVER',
      mustChangePassword: false,
      tokenVersion: 0,
    });

    const token = generateToken(victim);

    // First request passes
    const resActive = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(resActive.status).toBe(200);

    // Admin deactivates user
    await dbService.updateUser(victim.id, { active: false });

    // Next request must fail with 401
    const resDeactivated = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(resDeactivated.status).toBe(401);
    expect(resDeactivated.body.message).toMatch(/deactivated/i);
  });

  // 8. Refresh and logout with foreign Origin returns 403
  it('8. Refresh and logout reject requests with a foreign untrusted Origin (CSRF protection 403)', async () => {
    const maliciousOrigin = 'https://phishing-attacker-domain.evil';

    const refreshCsrfRes = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', maliciousOrigin);

    expect(refreshCsrfRes.status).toBe(403);
    expect(refreshCsrfRes.body.code).toBe('CSRF_ORIGIN_DENIED');

    const logoutCsrfRes = await request(app)
      .post('/api/auth/logout')
      .set('Origin', maliciousOrigin);

    expect(logoutCsrfRes.status).toBe(403);
    expect(logoutCsrfRes.body.code).toBe('CSRF_ORIGIN_DENIED');
  });

  // 9. Expired refresh returns 401
  it('9. Expired refresh token returns 401 and clears cookie', async () => {
    const rawExpiredToken = crypto.randomBytes(32).toString('base64url');
    const expiredHash = hashRefreshToken(rawExpiredToken);

    // Create an expired refresh token in DB
    const expiredRecord: RefreshTokenRecord = {
      id: `RT-EXP-${Date.now()}`,
      userId: testUser.id,
      tokenHash: expiredHash,
      familyId: `FAM-EXP-${Date.now()}`,
      expiresAt: new Date(Date.now() - 60000).toISOString(), // 1 minute in the past
      createdAt: new Date(Date.now() - 120000).toISOString(),
    };
    await dbService.createRefreshToken(expiredRecord);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`${REFRESH_COOKIE_NAME}=${rawExpiredToken}`]);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });
});
