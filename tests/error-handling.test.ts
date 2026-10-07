import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/server/app';
import { parseJsonSafe, getErrorMessage } from '../src/lib/apiFetch';
import { validateJwtSecret } from '../src/server/auth';
import vercelHandler from '../src/server/vercel-entry';

describe('Error Handling and Safe JSON Parsing Test Suite', () => {
  // =========================================================================
  // 1. parseJsonSafe & getErrorMessage Client Utility
  // =========================================================================
  describe('1. parseJsonSafe Client Utility', () => {
    it('returns null when response body is completely empty', async () => {
      const mockRes = new Response(null, {
        status: 204,
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await parseJsonSafe(mockRes);
      expect(result).toBeNull();
    });

    it('returns null when response body contains only whitespace', async () => {
      const mockRes = new Response('   \n\t  ', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
      const result = await parseJsonSafe(mockRes);
      expect(result).toBeNull();
    });

    it('returns null when response body is an HTML error page (e.g. Vercel 502/504)', async () => {
      const htmlBody = '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><h1>Bad Gateway</h1></body></html>';
      const mockRes = new Response(htmlBody, {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      });
      const result = await parseJsonSafe(mockRes);
      expect(result).toBeNull();
    });

    it('returns parsed object when response body is valid JSON', async () => {
      const validPayload = { success: true, count: 42, role: 'DISPATCHER' };
      const mockRes = new Response(JSON.stringify(validPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await parseJsonSafe(mockRes);
      expect(result).toEqual(validPayload);
    });

    it('returns null when response body contains malformed JSON without throwing SyntaxError', async () => {
      const malformed = '{"incomplete": true, ';
      const mockRes = new Response(malformed, {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await parseJsonSafe(mockRes);
      expect(result).toBeNull();
    });

    it('getErrorMessage extracts message from parsed JSON or falls back to status code', () => {
      const res404 = new Response('', { status: 404 });
      expect(getErrorMessage(res404, null)).toBe('Server error (404). Please try again.');

      const res500 = new Response('', { status: 500 });
      expect(getErrorMessage(res500, { message: 'Invalid credentials provided' })).toBe('Invalid credentials provided');

      expect(getErrorMessage(res500, { other: 123 })).toBe('Server error (500). Please try again.');
    });
  });

  // =========================================================================
  // 2. /api 404 and Error Handler Server Responses
  // =========================================================================
  describe('2. Server Error Handler & /api Catch-All', () => {
    it('GET /api/health returns { ok: true } only with no environment or database details', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(res.body.environment).toBeUndefined();
      expect(res.body.database).toBeUndefined();
      expect(res.body.supabaseUrl).toBeUndefined();
    });

    it('unknown /api route returns JSON 404 with { message, code: "NOT_FOUND" }', async () => {
      const res = await request(app).get('/api/nonexistent-route-xyz');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('root /api returns JSON 404 with { message, code: "NOT_FOUND" }', async () => {
      const res = await request(app).get('/api');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('server error sanitizes SQL/database details and returns JSON { message, code }', async () => {
      // Simulate error reaching global error handler
      const res = await request(app)
        .post('/api/orders/non-existent-order/temperature')
        .send({
          temperatureCelsius: 'not-a-number-schema-error',
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toHaveProperty('message');
      expect(res.body.stack).toBeUndefined();
      expect(res.body.error).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. Serverless VERCEL Mode & JWT_SECRET Configuration
  // =========================================================================
  describe('3. Vercel Serverless Configuration & validateJwtSecret', () => {
    it('in VERCEL mode with missing JWT_SECRET, validateJwtSecret throws without process.exit', () => {
      const origVercel = process.env.VERCEL;
      const origSecret = process.env.JWT_SECRET;
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      try {
        process.env.VERCEL = '1';
        delete process.env.JWT_SECRET;

        expect(() => validateJwtSecret()).toThrow(/JWT_SECRET environment variable is missing/);
        expect(exitSpy).not.toHaveBeenCalled();
      } finally {
        process.env.VERCEL = origVercel;
        process.env.JWT_SECRET = origSecret;
        exitSpy.mockRestore();
      }
    });

    it('vercelHandler returns JSON 500 when JWT_SECRET is missing instead of crashing', async () => {
      const origSecret = process.env.JWT_SECRET;
      try {
        delete process.env.JWT_SECRET;

        let statusCode = 0;
        let jsonResponse: any = null;
        const mockRes = {
          status: (code: number) => {
            statusCode = code;
            return {
              json: (data: any) => {
                jsonResponse = data;
              },
            };
          },
        };

        vercelHandler({} as any, mockRes as any);

        expect(statusCode).toBe(500);
        expect(jsonResponse).toEqual({
          message: 'Server configuration error',
          code: 'SERVER_CONFIG_ERROR',
        });
      } finally {
        process.env.JWT_SECRET = origSecret;
      }
    });
  });
});
