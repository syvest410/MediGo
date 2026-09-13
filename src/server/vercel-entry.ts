import { app } from './app';

// Export handler for Vercel Serverless Function
export default function handler(req: any, res: any) {
  return app(req, res);
}
export { app };
