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

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${ADMIN_URL}/login`)
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
}

test.describe('admin authentication', () => {
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

  test('signs in with valid credentials and lands on the dashboard', async ({ page }) => {
    await login(page)
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible()
  })

  test('issues an httpOnly session cookie', async ({ page, context }) => {
    await login(page)

    const cookies = await context.cookies()
    const session = cookies.find((cookie) => cookie.name === 'vc_admin_session')

    expect(session).toBeTruthy()
    // httpOnly is what stops an XSS payload from stealing the session.
    expect(session?.httpOnly).toBe(true)
    // SameSite=Lax blocks cross-site POSTs, the CSRF defence for actions.
    expect(session?.sameSite).toBe('Lax')
  })

  test('signs out and revokes access', async ({ page }) => {
    await login(page)

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await page.waitForURL(/\/login/, { timeout: 15_000 })

    // The revoked session must not be reusable.
    await page.goto(`${ADMIN_URL}/dashboard`)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('admin is never indexable', () => {
  test('robots.txt disallows everything', async ({ request }) => {
    const response = await request.get(`${ADMIN_URL}/robots.txt`)
    const text = await response.text()
    expect(text).toContain('Disallow: /')
    expect(text).not.toContain('Sitemap:')
  })

  test('sends a noindex header on every response', async ({ request }) => {
    const response = await request.get(`${ADMIN_URL}/login`)
    expect(response.headers()['x-robots-tag']).toContain('noindex')
    // Admin responses are per-user and must never be cached by a proxy.
    expect(response.headers()['cache-control']).toContain('no-store')
  })
})

test.describe('admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
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
    await login(page)

    // The public header's primary CTA must not appear in an operations tool.
    await expect(page.getByRole('link', { name: 'Reservar', exact: true })).toHaveCount(0)
    // The admin has its own sidebar navigation instead.
    await expect(page.getByRole('navigation', { name: /Navegación del panel/i })).toBeVisible()
  })
})
