import { expect, type Page } from '@playwright/test'

/**
 * Picks a date in a DatePicker the way a visitor does: open the calendar,
 * page forward to the right month, click the day.
 */
export async function pickDate(page: Page, triggerSelector: string, iso: string) {
  await page.locator(triggerSelector).click()
  // By id: the cookie banner is also a dialog.
  const dialog = page.locator(`${triggerSelector}-dialog`)
  await expect(dialog).toBeVisible()

  const day = dialog.locator(`[data-date="${iso}"]`)
  for (let i = 0; i < 14 && !(await day.isVisible()); i++) {
    await dialog.getByRole('button', { name: 'Mes siguiente' }).click()
  }
  await day.click()
  await expect(dialog).toBeHidden()
  await expect(page.locator(triggerSelector)).toHaveAttribute('data-value', iso)
}
