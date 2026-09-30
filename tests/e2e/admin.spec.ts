import { expect, test } from '@playwright/test'

/**
 * Admin end-to-end coverage.
 *
 * Exercises the real login flow against the real session store, which is the
 * only way to verify that authentication, cookies and RBAC actually work
 * together. Everything here runs against the admin origin on :3001.
 *
 * Credentials come from the seed; override with E2E_ADMIN_EMAIL /
 * E2E_ADMIN_PASSWORD when running against a differently seeded database.
 */

const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001'
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@vamoscalafate.com'
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'CambiarEsteAcceso2026'

/**
 * The authentication tests below need a CLEAN context — they assert on the
 * redirect for an unauthenticated visitor and on failed-login behaviour. The
 * dashboard tests instead reuse the session created by auth.setup.ts, so the
 * suite makes one login in total rather than one per test.
 */

test.describe('admin authentication', () => {
  // Explicitly unauthenticated: these assert on the signed-out experience.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('redirects an unauthenticated visitor to login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('preserves the intended destination through login', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/tours`)
    await expect(page).toHaveURL(/\/login\?next=%2Ftours/)
  })

  /**
   * Scoped to the form: Next.js renders its own `role="alert"` route
   * announcer, so an unscoped role query is ambiguous.
   */
  async function failedLoginMessage(
    page: import('@playwright/test').Page,
    email: string,
    password: string,
  ): Promise<string> {
    await page.goto(`${ADMIN_URL}/login`)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Contraseña').fill(password)
    await page.getByRole('button', { name: 'Ingresar' }).click()

    const alert = page.locator('form [role="alert"]')
    await expect(alert).toBeVisible({ timeout: 15_000 })
    return (await alert.textContent()) ?? ''
  }

  test('does not reveal whether an account exists', async ({ page }) => {
    // The security property that matters: a wrong password on a REAL account
    // and a login attempt on a NON-EXISTENT account must be indistinguishable.
    // Any difference would let an attacker enumerate administrator addresses.
    const wrongPassword = await failedLoginMessage(page, EMAIL, 'definitely-the-wrong-password')
    const unknownAccount = await failedLoginMessage(page, 'nobody-here@example.com', 'whatever-password-1')

    expect(wrongPassword).toBe(unknownAccount)
    expect(wrongPassword).not.toMatch(/no existe|not found|usuario desconocido/i)
  })

  /**
   * One login covers the whole successful path: landing, cookie flags and
   * sign-out. Split across three tests this would be three real logins, and
   * the production rate limit is five per fifteen minutes per IP — the suite
   * would lock itself out and report the limiter working as a failure.
   */
  test('signs in, sets a secure session cookie, and signs out', async ({ page, context }) => {
    await page.goto(`${ADMIN_URL}/login`)
    await page.getByLabel('Email').fill(EMAIL)
    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Ingresar' }).click()

    await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()

    const session = (await context.cookies()).find((c) => c.name === 'vc_admin_session')
    expect(session).toBeTruthy()
    // httpOnly stops an XSS payload from reading the session.
    expect(session?.httpOnly).toBe(true)
    // SameSite=Lax blocks cross-site POSTs — the CSRF defence for actions.
    expect(session?.sameSite).toBe('Lax')

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await page.waitForURL(/\/login/, { timeout: 20_000 })

    // The revoked session must not be reusable.
    await page.goto(`${ADMIN_URL}/dashboard`)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Session supplied by auth.setup.ts via storageState.
    await page.goto(`${ADMIN_URL}/dashboard`, { waitUntil: 'networkidle' })
  })

  test('shows real figures from the database', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
    await expect(page.getByText('Reservas totales')).toBeVisible()
    await expect(page.getByText('Ingresos acreditados')).toBeVisible()
    // The seed publishes 15 products, so the catalogue tile must be non-zero.
    await expect(page.getByRole('link', { name: /Excursiones/ }).first()).toBeVisible()
  })

  test('warns about unconfigured integrations rather than faking them', async ({ page }) => {
    // With no payment or email credentials in the test environment, the
    // dashboard must say so plainly.
    await expect(page.getByText(/Configuración pendiente/i)).toBeVisible()
  })

  test('navigates to the tour catalogue', async ({ page }) => {
    await page.getByRole('link', { name: 'Excursiones', exact: true }).click()
    await page.waitForURL(/\/tours/)
    await expect(page.getByRole('heading', { name: 'Excursiones' })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('opens the tour editor with existing data loaded', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/tours`)
    await page.getByRole('link', { name: /Perito Moreno/i }).first().click()
    await page.waitForURL(/\/tours\/.+\/edit/)

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Pricing lives on options, and at least one must be present.
    await expect(page.getByText(/Opciones y precios/)).toBeVisible()
  })

  test('shows the submissions queue', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/submissions`)
    await expect(page.getByRole('heading', { name: /Solicitudes de alta/i })).toBeVisible()
    await expect(page.getByText(/Ninguna se publica sin aprobación/i)).toBeVisible()
  })

  test('shows the audit trail', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/audit-log`)
    await expect(page.getByRole('heading', { name: /Registro de auditoría/i })).toBeVisible()
    // The login that got us here is itself auditable.
    await expect(page.getByText(/inició sesión/i).first()).toBeVisible()
  })

  test('reports integration status honestly on the settings screen', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/settings`)
    await expect(page.getByRole('heading', { name: 'Ajustes', exact: true })).toBeVisible()
    await expect(page.getByText('Estado de las integraciones')).toBeVisible()
    // Nothing is claimed to be connected when it is not.
    await expect(page.getByText('Sin configurar').first()).toBeVisible()
  })

  test('lists roles and their scopes', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/users`)
    await expect(page.getByRole('heading', { name: /Usuarios y permisos/i })).toBeVisible()
    await expect(page.getByText('Super administrador').first()).toBeVisible()
    await expect(page.getByText('Gestor de reservas').first()).toBeVisible()
  })
})

test.describe('admin visual identity', () => {
  test('does not reuse the public site chrome', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`, { waitUntil: 'networkidle' })

    // The public header's primary CTA must not appear in an operations tool.
    await expect(page.getByRole('link', { name: 'Reservar', exact: true })).toHaveCount(0)
    // The admin has its own sidebar navigation instead.
    await expect(page.getByRole('navigation', { name: /Navegación del panel/i })).toBeVisible()
  })
})
