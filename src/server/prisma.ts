import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Serverless singleton connection pooling to prevent exhausting Postgres connections during cold starts
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export function isPrismaAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}
