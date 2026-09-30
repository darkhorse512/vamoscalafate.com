import { expect, test } from '@playwright/test'

/**
 * Mobile coverage.
 *
 * The mobile booking path is the primary conversion route for a tourism site,
 * so it gets first-class tests rather than being assumed to work because the
 * desktop layout does.
 *
 * Runs on the Pixel 7 profile configured in playwright.config.ts.
 */

test.describe('mobile layout', () => {
  test('never scrolls horizontally on key pages', async ({ page }) => {
    for (const path of ['/', '/excursiones', '/excursiones/minitrekking-perito-moreno', '/blog']) {
      await page.goto(path)

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )

      expect(overflows, `${path} scrolls horizontally on mobile`).toBe(false)
    }
  })

  test('opens and closes the navigation drawer', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /Abrir menú/i }).click()

    const drawer = page.getByRole('dialog', { name: /Menú de navegación/i })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('link', { name: 'Excursiones', exact: true })).toBeVisible()

    // Scoped to the dialog: the backdrop shares the same accessible name, and
    // on a narrow phone the panel covers its centre point.
    await drawer.getByRole('button', { name: /Cerrar menú/i }).click()
    await expect(drawer).toBeHidden()
  })

  test('closes the drawer with the Escape key', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Abrir menú/i }).click()

    const drawer = page.getByRole('dialog', { name: /Menú de navegación/i })
    await expect(drawer).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('keeps the booking action reachable on a tour page', async ({ page }) => {
    await page.goto('/excursiones/glaciar-perito-moreno-pasarelas')

    // Scroll to the bottom - the widget itself is far above by now.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // A sticky bar keeps the primary action in reach; a widget that scrolls
    // away is the single biggest mobile conversion leak.
    const stickyBar = page.getByRole('button', { name: 'Reservar', exact: true })
    await expect(stickyBar).toBeVisible()
  })

  test('touch targets on the primary CTA are large enough', async ({ page }) => {
    await page.goto('/excursiones/glaciar-perito-moreno-pasarelas')

    const button = page.getByRole('button', { name: 'Reservar', exact: true })
    const box = await button.boundingBox()

    // WCAG 2.5.5 / platform guidance: ~44px minimum comfortable target.
    expect(box!.height).toBeGreaterThanOrEqual(40)
  })
})

test.describe('mobile booking flow', () => {
  test('completes the selection step on a phone', async ({ page }) => {
    await page.goto('/excursiones/glaciar-perito-moreno-pasarelas', { waitUntil: 'networkidle' })

    const target = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10)
    await page.locator('#bw-date').fill(target)

    const timeButton = page.getByRole('button', { name: /lug\./ }).first()
    await expect(timeButton).toBeVisible({ timeout: 15_000 })
    await timeButton.click()

    await expect(page.getByText(/Total estimado/i)).toBeVisible()

    await page.getByRole('button', { name: /Continuar con la reserva/i }).click()
    await expect(page).toHaveURL(/\/reservar\?/)

    // The details form must be usable at phone width.
    await expect(page.getByLabel('Nombre', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuar al pago/i })).toBeVisible()
  })
})

test.describe('mobile accessibility', () => {
  test('every image has an accessible name', async ({ page }) => {
    await page.goto('/excursiones')

    const images = page.locator('img')
    const count = await images.count()

    for (let index = 0; index < count; index += 1) {
      const alt = await images.nth(index).getAttribute('alt')
      // An empty alt is valid ONLY for decorative images, which this site
      // renders as inline SVG rather than <img>.
      expect(alt, `image ${index} is missing alt text`).not.toBeNull()
    }
  })

  test('the skip link is the first thing a keyboard user reaches', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')

    const focused = page.locator(':focus')
    await expect(focused).toHaveText(/Saltar al contenido/i)
  })
})
