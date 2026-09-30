import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

/**
 * Prisma 7 configuration.
 *
 * The connection URL lives here (not in schema.prisma) and is read from the
 * environment, so credentials never enter version control. `prisma migrate`
 * and `prisma studio` use this; the runtime client builds its own pool from
 * the same variable in src/client.ts.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'node --experimental-strip-types prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
