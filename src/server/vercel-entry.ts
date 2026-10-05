import { app } from './app';
import { validateJwtSecret } from './auth';

// Ensure JWT_SECRET is verified at startup
validateJwtSecret();

// Export handler for Vercel Serverless Function
export default function handler(req: any, res: any) {
  validateJwtSecret();
  return app(req, res);
}
export { app };
