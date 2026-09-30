import { describe, expect, it } from 'vitest'
import { centsToProviderAmount, formatMoney, fromCents, toCents } from '@vamos/shared'

/**
 * Money is stored as integer minor units precisely so that arithmetic on
 * prices is exact. These tests pin that guarantee down.
 */
describe('money', () => {
  it('converts major units to minor units without float drift', () => {
    expect(toCents(145_000)).toBe(14_500_000)
    expect(toCents(0.1)).toBe(10)
    expect(toCents(0.2)).toBe(20)
    // The canonical float-arithmetic failure: 0.1 + 0.2 !== 0.3
    expect(toCents(0.1) + toCents(0.2)).toBe(toCents(0.3))
  })

  it('rounds half-cent amounts rather than truncating', () => {
    expect(toCents(10.005)).toBe(1001)
    expect(toCents(10.004)).toBe(1000)
  })

  it('round-trips through fromCents', () => {
    for (const amount of [0, 1, 99.99, 145_000, 1_234.56]) {
      expect(fromCents(toCents(amount))).toBeCloseTo(amount, 2)
    }
  })

  it('formats ARS without decimals by default', () => {
    const formatted = formatMoney(14_500_000, 'ARS')
    expect(formatted).toContain('145.000')
    expect(formatted).not.toContain(',00')
  })

  it('formats with decimals when asked', () => {
    expect(formatMoney(1050, 'ARS', { showDecimals: true })).toContain('10,50')
  })

  it('produces a two-decimal provider amount', () => {
    expect(centsToProviderAmount(14_500_000)).toBe(145_000)
    expect(centsToProviderAmount(1999)).toBe(19.99)
    // No float tail: 1/3 of a cent cannot survive, and must not.
    expect(centsToProviderAmount(3333)).toBe(33.33)
  })

  it('never returns a negative total for a zero price', () => {
    expect(formatMoney(0, 'ARS')).toContain('0')
  })
})
