/**
 * Test environment.
 *
 * Fills in the variables the apps validate at boot so importing a module under
 * test never fails on missing config. DATABASE_URL is NOT defaulted: an
 * integration test must run against a database the operator chose, never
 * silently against something unexpected.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test'
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ?? 'test_only_auth_secret_at_least_32_characters_long_0123'
process.env.REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? 'test_only_revalidate_secret'
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
process.env.NEXT_PUBLIC_ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001'
process.env.EMAIL_TRANSPORT = 'console'
process.env.DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY ?? 'ARS'
