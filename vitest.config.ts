import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Unit and integration test configuration.
 *
 * Integration tests talk to a REAL PostgreSQL database (see
 * tests/integration/setup.ts) rather than a mock. Mocking the database would
 * mean the tests never exercise the constraints, transactions and conditional
 * updates that the booking logic actually depends on for correctness.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // Integration tests share one database; running files in parallel would
    // let them clobber each other's fixtures.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['tests/setup-env.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'web/src/server/**/*.ts'],
      exclude: ['**/*.d.ts', '**/generated/**'],
    },
  },
  resolve: {
    alias: {
      '@vamos/db/enums': path.resolve(__dirname, 'packages/db/generated/client/enums.ts'),
      '@vamos/db': path.resolve(__dirname, 'packages/db/src/index.ts'),
      '@vamos/types': path.resolve(__dirname, 'packages/types/src/index.ts'),
      '@vamos/shared/rate-limit': path.resolve(__dirname, 'packages/shared/src/rate-limit.ts'),
      '@vamos/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@vamos/validation': path.resolve(__dirname, 'packages/validation/src/index.ts'),
      '@vamos/email': path.resolve(__dirname, 'packages/email/src/index.ts'),
    },
  },
})
