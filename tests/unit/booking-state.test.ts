import { describe, expect, it } from 'vitest'
import { BOOKING_TRANSITIONS, canTransitionBooking } from '@vamos/types'

/**
 * The booking state machine is the guard against a booking being moved into a
 * state that makes no commercial sense - a refunded booking becoming paid
 * again, say. Every path that changes status routes through it.
 */
describe('booking state machine', () => {
  it('allows the normal happy path', () => {
    expect(canTransitionBooking('PENDING', 'AWAITING_PAYMENT')).toBe(true)
    expect(canTransitionBooking('AWAITING_PAYMENT', 'PAID')).toBe(true)
    expect(canTransitionBooking('PAID', 'CONFIRMED')).toBe(true)
    expect(canTransitionBooking('CONFIRMED', 'COMPLETED')).toBe(true)
  })

  it('treats a no-op transition as allowed', () => {
    expect(canTransitionBooking('CONFIRMED', 'CONFIRMED')).toBe(true)
  })

  it('refuses to resurrect a refunded booking', () => {
    expect(canTransitionBooking('REFUNDED', 'PAID')).toBe(false)
    expect(canTransitionBooking('REFUNDED', 'CONFIRMED')).toBe(false)
    expect(BOOKING_TRANSITIONS.REFUNDED).toHaveLength(0)
  })

  it('refuses to skip payment', () => {
    expect(canTransitionBooking('PENDING', 'COMPLETED')).toBe(false)
    expect(canTransitionBooking('AWAITING_PAYMENT', 'COMPLETED')).toBe(false)
  })

  it('refuses to un-cancel a booking', () => {
    expect(canTransitionBooking('CANCELLED', 'CONFIRMED')).toBe(false)
    expect(canTransitionBooking('CANCELLED', 'PAID')).toBe(false)
  })

  it('permits refunding a cancelled booking', () => {
    // A customer can be owed money after a cancellation.
    expect(canTransitionBooking('CANCELLED', 'REFUNDED')).toBe(true)
  })

  it('permits refunding a completed booking', () => {
    expect(canTransitionBooking('COMPLETED', 'REFUNDED')).toBe(true)
  })

  it('defines a transition list for every status', () => {
    const statuses = Object.keys(BOOKING_TRANSITIONS)
    expect(statuses).toHaveLength(7)
    for (const status of statuses) {
      expect(Array.isArray(BOOKING_TRANSITIONS[status as keyof typeof BOOKING_TRANSITIONS])).toBe(true)
    }
  })
})
