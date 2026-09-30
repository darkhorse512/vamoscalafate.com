/**
 * Money helpers.
 *
 * Everything in this platform stores money as an integer count of minor units
 * (centavos for ARS, cents for USD). Floating point never touches a price:
 * 0.1 + 0.2 !== 0.3 is not an acceptable property for a booking total.
 */

export type Currency = 'ARS' | 'USD' | 'EUR' | 'BRL'

const LOCALE_BY_CURRENCY: Record<string, string> = {
  ARS: 'es-AR',
  USD: 'en-US',
  EUR: 'es-ES',
  BRL: 'pt-BR',
}

/** Formats minor units for display, e.g. 14500000 + "ARS" → "$ 145.000". */
export function formatMoney(
  cents: number,
  currency: string = 'ARS',
  options: { showDecimals?: boolean; locale?: string } = {},
): string {
  const { showDecimals = false, locale } = options
  const resolvedLocale = locale ?? LOCALE_BY_CURRENCY[currency] ?? 'es-AR'

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(cents / 100)
}

/** Converts a major-unit amount (what an admin types) into minor units. */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/** Converts minor units back to a major-unit number, for form inputs. */
export function fromCents(cents: number): number {
  return cents / 100
}

/**
 * Payment providers take amounts in major units as a decimal. Producing that
 * string from the integer avoids reintroducing float error at the boundary.
 */
export function centsToProviderAmount(cents: number): number {
  return Number((cents / 100).toFixed(2))
}

/** Stripe takes minor units directly for zero-decimal-aware currencies. */
export function centsForStripe(cents: number): number {
  return Math.round(cents)
}
