import { expect, test as setup } from '@playwright/test'
import path from 'node:path'

/**
 * Signs in ONCE and saves the session for every admin test to reuse.
 *
 * Logging in per test exhausts the admin's own rate limit — five attempts per
 * fifteen minutes per IP — so a full run would lock itself out and report
 * failures that are the limiter working correctly, not bugs.
 *
 * Reusing the storage state also makes the suite far faster and exercises the
 * session cookie the way a real operator's browser does.
 */

export const ADMIN_STATE = path.join(process.cwd(), 'tests/e2e/.auth/admin.json')

const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001'
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@vamoscalafate.com'

/*
 * No default password.
 *
 * There used to be one — the seed's initial value. Once that password was
 * rotated, as it must be, every admin test failed with a 30-second navigation
 * timeout and a screenshot, which reads like an application bug rather than a
 * missing credential. Requiring the variable turns a misleading failure into
 * a one-line explanation.
 *
 * Tests deliberately do not hold a copy of the operator's password: supply it
 * for the run, e.g.
 *   E2E_ADMIN_PASSWORD='…' pnpm test:e2e
 */
const PASSWORD = process.env.E2E_ADMIN_PASSWORD

setup('authenticate as administrator', async ({ page }) => {
  setup.skip(
    !PASSWORD,
    'E2E_ADMIN_PASSWORD is not set, so the admin suite cannot sign in. ' +
      'Set it to the administrator password to run those tests.',
  )

  await page.goto(`${ADMIN_URL}/login`)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Contraseña').fill(PASSWORD as string)
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()

  await page.context().storageState({ path: ADMIN_STATE })
})
