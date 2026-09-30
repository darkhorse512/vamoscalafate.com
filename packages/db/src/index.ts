export { prisma } from './client.ts'
export type { PrismaClientInstance } from './client.ts'

// Re-export the generated model types and enums so applications import from
// `@vamos/db` and never reach into the generated directory directly.
export * from '../generated/client/client.ts'

export * from './cache-tags.ts'
export * from './pricing-sync.ts'
