import { app } from './app';
import { validateJwtSecret } from './auth';

// Export handler for Vercel Serverless Function
export default function handler(req: any, res: any) {
  try {
    validateJwtSecret();
  } catch (err: any) {
    console.error('[Vercel Serverless Config Error]:', err?.message || err);
    if (res && typeof res.status === 'function') {
      return res.status(500).json({
        message: 'Server configuration error: JWT_SECRET environment variable is missing or shorter than 32 characters.',
        code: 'SERVER_CONFIG_ERROR',
      });
    }
  }
  return app(req, res);
}
export { app };

