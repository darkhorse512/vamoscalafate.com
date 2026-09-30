export * from './env.ts'
export * from './rbac.ts'
export * from './money.ts'
export * from './slug.ts'
export * from './format.ts'
export * from './logger.ts'
export * from './site.ts'
export * from './errors.ts'

// NOTE: `rate-limit.ts` is deliberately NOT re-exported here.
//
// It imports @vamos/db, which pulls the PostgreSQL driver in. Anything
// exported from this barrel can be imported by a Client Component (for ROUTES
// or formatMoney, say), and that would drag the database client into the
// browser bundle. Server code imports it explicitly:
//
//   import { checkRateLimit, RATE_LIMITS } from '@vamos/shared/rate-limit'
