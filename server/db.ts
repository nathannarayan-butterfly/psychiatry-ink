import { PrismaClient } from '@prisma/client'

function warnIfDatabaseUrlMisconfigured() {
  const url = process.env.DATABASE_URL?.trim() ?? ''
  if (!url) {
    console.warn(
      '[api] DATABASE_URL is unset — Prisma routes (credits, patients, diagnoses, …) will fail. ' +
        'Set postgresql:// URLs in .env.local (see .env.example).',
    )
    return
  }
  if (url.startsWith('file:')) {
    console.error(
      '[api] DATABASE_URL still uses SQLite (file:…) but the schema requires PostgreSQL. ' +
        'Update .env.local: replace DATABASE_URL with a postgresql:// URL and add DIRECT_URL. ' +
        'Use Supabase → Database → Connection string (pooled :6543 + direct :5432), or local Postgres — see .env.example.',
    )
    return
  }
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    console.warn(
      '[api] DATABASE_URL does not look like a PostgreSQL URL — Prisma may fail at runtime.',
    )
  }
  if (!process.env.DIRECT_URL?.trim()) {
    console.warn(
      '[api] DIRECT_URL is unset — `prisma migrate deploy` / `prisma db push` need a direct :5432 URL. ' +
        'See .env.example.',
    )
  }
}

warnIfDatabaseUrlMisconfigured()

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
