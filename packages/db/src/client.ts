import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client/client.ts'

/**
 * Singleton Prisma client.
 *
 * Prisma 7 connects through a driver adapter, so the node-postgres pool is
 * ours to size. On a VPS running two Next.js processes under PM2, each
 * process keeps its own pool - keep `connection_limit` in DATABASE_URL and
 * PostgreSQL's `max_connections` consistent with that.
 *
 * In development Next.js hot-reloads modules on every edit; stashing the
 * client on `globalThis` stops each reload from opening a fresh pool and
 * exhausting PostgreSQL connections.
 */

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and provide a PostgreSQL connection string.',
  )
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  })
}

type PrismaClientInstance = ReturnType<typeof createPrismaClient>

const globalForPrisma = globalThis as unknown as {
  __vamosPrisma?: PrismaClientInstance
}

export const prisma: PrismaClientInstance = globalForPrisma.__vamosPrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__vamosPrisma = prisma
}

export type { PrismaClientInstance }
