import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests.
 *
 * Runs against the real production builds of BOTH applications, started by
 * the webServer blocks below. Testing the dev server would miss exactly the
 * class of bug that only appears in a production build - static prerendering,
 * caching, and the standalone output layout.
 *
 * Start the database and seed it before running:
 *   pnpm db:migrate:deploy && pnpm db:seed && pnpm build && pnpm test:e2e
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.E2E_WEB_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Rio_Gallegos',
  },

  projects: [
    /**
     * Signs in once and hands the session to the admin tests. Without this,
     * each test's own login exhausts the five-attempt rate limit and the run
     * fails on the limiter doing its job.
     */
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // mobile.spec.ts asserts on the drawer and the sticky booking bar, both
      // of which are correctly hidden at desktop width. admin.spec.ts runs in
      // its own authenticated project below.
      testIgnore: [/mobile\.spec\.ts/, /admin\.spec\.ts/, /auth\.setup\.ts/],
    },

    {
      name: 'admin',
      testMatch: /admin\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/admin.json',
      },
    },
    // The mobile booking path is the primary conversion route, so it is
    // covered as a first-class target rather than an afterthought.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],

  webServer: [
    {
      command: 'node .next/standalone/web/server.js',
      cwd: './web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { PORT: '3000' },
    },
    {
      command: 'node .next/standalone/admin/server.js',
      cwd: './admin',
      url: 'http://localhost:3001/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { PORT: '3001' },
    },
  ],
})
