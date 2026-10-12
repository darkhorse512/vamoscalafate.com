import { describe, expect, it } from 'vitest'
import { priceForDate, rateForDate } from '@vamos/shared'

/**
 * Seasonal rates decide what a customer is charged, so the resolution rule is
 * pinned down here rather than left to be inferred from the implementation.
 *
 * The same function runs in the browser (to preview a price) and on the server
 * (to charge it). If it ever disagreed with itself the customer would see one
 * number and be billed another, which is why there is no second code path to
 * test: these cases cover both.
 */
describe('rateForDate', () => {
  const high = { label: 'Temporada alta', startDate: '2026-11-01', endDate: '2026-11-30', priceCents: 42_000_000 }
  const holiday = { label: 'Fin de año', startDate: '2026-11-20', endDate: '2026-11-25', priceCents: 48_000_000 }

  it('returns null outside every range, so the standing price applies', () => {
    expect(rateForDate([high], '2026-10-31')).toBeNull()
    expect(rateForDate([high], '2026-12-01')).toBeNull()
    expect(rateForDate([], '2026-11-10')).toBeNull()
  })

  it('includes both endpoints', () => {
    expect(rateForDate([high], '2026-11-01')).toBe(high)
    expect(rateForDate([high], '2026-11-30')).toBe(high)
  })

  it('prefers the narrowest covering range, so an exception can sit inside a season', () => {
    expect(rateForDate([high, holiday], '2026-11-22')).toBe(holiday)
    expect(rateForDate([high, holiday], '2026-11-10')).toBe(high)
    // Order of definition must not matter.
    expect(rateForDate([holiday, high], '2026-11-22')).toBe(holiday)
  })

  it('breaks a tie on the later start date', () => {
    const a = { label: 'a', startDate: '2026-11-01', endDate: '2026-11-07', priceCents: 1 }
    const b = { label: 'b', startDate: '2026-11-03', endDate: '2026-11-09', priceCents: 2 }
    expect(rateForDate([a, b], '2026-11-05')).toBe(b)
  })

  it('compares Date objects as UTC calendar days, not instants', () => {
    const rate = {
      label: null,
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-30T00:00:00.000Z'),
      priceCents: 1,
    }
    // Late in the day on the last date still falls inside the season.
    expect(rateForDate([rate], new Date('2026-11-30T23:30:00.000Z'))).toBe(rate)
  })
})

describe('priceForDate', () => {
  const band = {
    priceCents: 39_500_000,
    rates: [{ label: 'Temporada alta', startDate: '2026-11-01', endDate: '2026-11-30', priceCents: 42_000_000 }],
  }

  it('falls back to the standing price', () => {
    expect(priceForDate(band, '2026-10-12')).toEqual({ priceCents: 39_500_000 })
  })

  it('uses the seasonal price and names the season', () => {
    expect(priceForDate(band, '2026-11-15')).toEqual({
      priceCents: 42_000_000,
      seasonLabel: 'Temporada alta',
    })
  })

  it('tolerates a band with no rates at all', () => {
    expect(priceForDate({ priceCents: 100 }, '2026-11-15')).toEqual({ priceCents: 100 })
  })
})
