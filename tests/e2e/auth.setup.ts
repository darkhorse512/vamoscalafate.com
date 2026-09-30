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
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'CambiarEsteAcceso2026'

setup('authenticate as administrator', async ({ page }) => {
  await page.goto(`${ADMIN_URL}/login`)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()

  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()

  await page.context().storageState({ path: ADMIN_STATE })
})
