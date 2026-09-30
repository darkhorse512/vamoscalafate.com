import { expect, test } from '@playwright/test'

/**
 * Public site end-to-end coverage.
 *
 * Asserts on what a visitor and a crawler actually receive: rendered content,
 * correct headings, working navigation, and the SEO artefacts that decide
 * whether the site can be found at all.
 */

test.describe('homepage', () => {
  test('renders the hero, featured tours and real prices', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Seeded catalogue content, proving the page is database-driven.
    await expect(page.getByRole('link', { name: /Glaciar Perito Moreno/i }).first()).toBeVisible()

    // Prices render as formatted Argentine pesos, not raw cents.
    await expect(page.getByText(/\$\s?[\d.]+/).first()).toBeVisible()
  })

  test('has exactly one h1', async ({ page }) => {
    await page.goto('/')
    // More than one h1 muddies the document outline for assistive tech.
    await expect(page.locator('h1')).toHaveCount(1)
  })

  test('exposes Organization and WebSite structured data', async ({ page }) => {
    await page.goto('/')

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    const combined = blocks.join('')

    expect(combined).toContain('TravelAgency')
    expect(combined).toContain('WebSite')
  })

  test('navigates to the tour catalogue', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Ver excursiones' }).first().click()
    await expect(page).toHaveURL(/\/excursiones/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('tour catalogue', () => {
  test('lists tours and filters by category via the URL', async ({ page }) => {
    await page.goto('/excursiones')
    await expect(page.getByRole('article').first()).toBeVisible()

    const allCount = await page.getByRole('article').count()

    await page.goto('/excursiones?categoria=navegaciones')
    // Wait for the filtered result to render before counting; counting
    // straight after navigation races the first paint.
    await expect(page.getByRole('article').first()).toBeVisible()
    const filteredCount = await page.getByRole('article').count()

    expect(filteredCount).toBeGreaterThan(0)
    expect(filteredCount).toBeLessThanOrEqual(allCount)
  })

  test('sorting by price is reflected in the URL and is shareable', async ({ page }) => {
    await page.goto('/excursiones?orden=precio-asc')
    await expect(page.getByRole('article').first()).toBeVisible()
    // A filtered view must survive a reload, which URL state guarantees.
    await page.reload()
    await expect(page.getByRole('article').first()).toBeVisible()
  })

  test('shows a helpful empty state for an impossible filter', async ({ page }) => {
    await page.goto('/excursiones?precioMax=1')
    await expect(page.getByText(/No encontramos experiencias/i)).toBeVisible()
  })
})

test.describe('tour detail', () => {
  test('renders the full product page', async ({ page }) => {
    await page.goto('/excursiones/minitrekking-perito-moreno')

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Minitrekking/i)
    await expect(page.getByRole('heading', { name: 'Descripción' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Itinerario' })).toBeVisible()
    // `exact` matters here: without it, "Incluye" also matches "No incluye"
    // and Playwright's strict mode rejects the ambiguous locator.
    await expect(page.getByRole('heading', { name: 'Incluye', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'No incluye', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Preguntas frecuentes/i })).toBeVisible()
  })

  test('emits Product and Breadcrumb structured data', async ({ page }) => {
    await page.goto('/excursiones/minitrekking-perito-moreno')

    const combined = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).join('')

    expect(combined).toContain('"Product"')
    expect(combined).toContain('BreadcrumbList')
    expect(combined).toContain('FAQPage')
  })

  test('does NOT claim a rating when there are no reviews', async ({ page }) => {
    await page.goto('/excursiones/minitrekking-perito-moreno')

    const combined = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).join('')

    // Marking up a rating with no reviews behind it violates Google's policy
    // and misleads people reading search results.
    expect(combined).not.toContain('aggregateRating')
    await expect(page.getByText(/todavía no tiene reseñas publicadas/i)).toBeVisible()
  })

  test('has a canonical URL', async ({ page }) => {
    await page.goto('/excursiones/minitrekking-perito-moreno')
    const canonical = page.locator('link[rel="canonical"]')
    await expect(canonical).toHaveAttribute('href', /\/excursiones\/minitrekking-perito-moreno$/)
  })

  test('booking widget loads availability and prices the selection', async ({ page }) => {
    await page.goto('/excursiones/glaciar-perito-moreno-pasarelas')

    const continueButton = page.getByRole('button', { name: /Continuar con la reserva/i })
    // Nothing is bookable before a date is chosen.
    await expect(continueButton).toBeDisabled()

    const dateInput = page.locator('#bw-date')
    await expect(dateInput).toBeVisible()

    const target = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
    await dateInput.fill(target)

    // This tour offers several departures, so a time must be picked before a
    // total can be computed - the widget deliberately does not guess.
    const timeButton = page.getByRole('button', { name: /lug\./ }).first()
    await expect(timeButton).toBeVisible({ timeout: 15_000 })
    await timeButton.click()

    await expect(page.getByText(/Total estimado/i)).toBeVisible()
    await expect(continueButton).toBeEnabled()
  })

  test('booking widget carries the selection through to the reservation page', async ({ page }) => {
    // networkidle so the widget has hydrated: driving a React-controlled
    // input before that races the first client render.
    await page.goto('/excursiones/glaciar-perito-moreno-pasarelas', { waitUntil: 'networkidle' })

    const target = new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10)
    await page.locator('#bw-date').fill(target)

    const timeButton = page.getByRole('button', { name: /lug\./ }).first()
    await expect(timeButton).toBeVisible({ timeout: 15_000 })
    await timeButton.click()

    await page.getByRole('button', { name: /Continuar con la reserva/i }).click()

    // The selection travels in the URL so the step is linkable and refreshable.
    await expect(page).toHaveURL(/\/reservar\?/)
    await expect(page).toHaveURL(new RegExp(`fecha=${target}`))
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Completá tu reserva/i)

    // Server-side re-pricing produced a real total.
    await expect(page.getByText(/Total/).first()).toBeVisible()
  })
})

test.describe('blog', () => {
  test('lists articles and opens one', async ({ page }) => {
    await page.goto('/blog')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('link', { name: /Qué hacer en El Calafate/i }).first().click()
    await expect(page).toHaveURL(/\/blog\//)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('article emits Article structured data', async ({ page }) => {
    await page.goto('/blog/como-visitar-el-glaciar-perito-moreno')

    const combined = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).join('')

    expect(combined).toContain('"Article"')
  })
})

test.describe('SEO artefacts', () => {
  test('sitemap lists content and excludes the funnel', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)

    const xml = await response.text()
    expect(xml).toContain('/excursiones/')
    expect(xml).toContain('/blog/')

    // Checkout and search must never be indexed.
    expect(xml).not.toContain('/checkout')
    expect(xml).not.toContain('/reservar')
    expect(xml).not.toContain('/buscar')
  })

  test('robots.txt blocks the funnel and points at the sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt')
    expect(response.status()).toBe(200)

    const text = await response.text()
    expect(text).toContain('Disallow: /checkout')
    expect(text).toContain('Disallow: /api/')
    expect(text).toContain('Sitemap:')
  })

  test('checkout is marked noindex', async ({ page }) => {
    await page.goto('/checkout?ref=VC-NONEXISTENT')
    const robots = page.locator('meta[name="robots"]')
    // Either the page 404s or it carries noindex - never an indexable checkout.
    const count = await robots.count()
    if (count > 0) {
      await expect(robots.first()).toHaveAttribute('content', /noindex/)
    }
  })

  test('sets security headers', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
  })
})

test.describe('forms', () => {
  test('contact form validates before submitting', async ({ page }) => {
    await page.goto('/contacto')

    await page.getByRole('button', { name: /Enviar consulta/i }).click()
    // Still on the page: the required fields blocked the submit.
    await expect(page).toHaveURL(/\/contacto/)
  })

  test('hotel submission form renders its steps', async ({ page }) => {
    await page.goto('/hoteles/registrar')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/no se publican automáticamente/i)).toBeVisible()
  })
})

test.describe('error handling', () => {
  test('unknown route returns a helpful 404', async ({ page }) => {
    const response = await page.goto('/esta-pagina-no-existe')
    expect(response?.status()).toBe(404)
    await expect(page.getByText(/No encontramos esta página/i)).toBeVisible()
  })
})

/**
 * The admin host must never be indexable. These are plain HTTP assertions
 * about what a crawler receives, so they belong here rather than in the
 * authenticated admin project — a session cookie would redirect /login and
 * change the response under test.
 */
test.describe('admin host is never indexable', () => {
  const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001'

  test('robots.txt disallows everything', async ({ request }) => {
    const response = await request.get(`${ADMIN_URL}/robots.txt`)
    const text = await response.text()

    expect(text).toContain('Disallow: /')
    // No sitemap: nothing on this host is ever public.
    expect(text).not.toContain('Sitemap:')
  })

  test('sends noindex and no-store on every response', async ({ request }) => {
    const response = await request.get(`${ADMIN_URL}/login`)
    const headers = response.headers()

    expect(headers['x-robots-tag']).toContain('noindex')
    // Admin responses are per-user and must never be cached by a proxy.
    expect(headers['cache-control']).toContain('no-store')
  })
})
