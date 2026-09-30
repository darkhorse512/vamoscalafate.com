import type { BookingStatus, Difficulty } from './models.ts'

/**
 * Booking domain contracts.
 *
 * `web` talks to BookingService / AvailabilityService / PricingService through
 * these shapes only. Nothing here references Mercado Pago, Stripe or any
 * external booking engine, which is what allows an external supplier to be
 * plugged in later without touching the UI.
 */

/** One departure the customer can pick. */
export type AvailabilitySlot = {
  /** `yyyy-mm-dd`, UTC. */
  date: string
  departureTime: string | null
  optionId: string
  seatsAvailable: number
  priceCents: number
  currency: string
  /** Null when inventory is implicit (no explicit TourAvailability row). */
  availabilityId: string | null
}

export type AvailabilityQuery = {
  tourId: string
  optionId?: string
  /** Inclusive `yyyy-mm-dd` range. */
  from: string
  to: string
}

/** What the customer configured, before pricing is applied. */
export type BookingSelection = {
  tourId: string
  optionId: string
  date: string
  departureTime?: string | null
  adults: number
  children: number
  pickupLocationId?: string | null
}

/** Transparent, line-by-line price breakdown. Never a single opaque total. */
export type PriceBreakdown = {
  adults: number
  children: number
  adultUnitCents: number
  childUnitCents: number
  adultsSubtotalCents: number
  childrenSubtotalCents: number
  pickupCostCents: number
  subtotalCents: number
  discountCents: number
  totalCents: number
  currency: string
}

export type CustomerDetails = {
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  hotelName?: string
  specialRequests?: string
  marketingOptIn?: boolean
}

export type PassengerDetails = {
  firstName: string
  lastName: string
  type: 'ADULT' | 'CHILD' | 'INFANT' | 'SENIOR'
  nationality?: string
}

/** Campaign attribution captured at checkout and preserved through payment. */
export type AttributionData = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  referrer?: string
}

export type CreateBookingInput = {
  selection: BookingSelection
  customer: CustomerDetails
  passengers?: PassengerDetails[]
  attribution?: AttributionData
}

export type CreatedBooking = {
  bookingId: string
  reference: string
  status: BookingStatus
  totalCents: number
  currency: string
}

/**
 * Legal booking state machine. Enforced centrally so no call site can move a
 * booking from, say, REFUNDED back to PAID.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAID', 'CANCELLED', 'PENDING'],
  PAID: ['CONFIRMED', 'REFUNDED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
  CANCELLED: ['REFUNDED'],
  COMPLETED: ['REFUNDED'],
  REFUNDED: [],
}

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true
  return BOOKING_TRANSITIONS[from]?.includes(to) ?? false
}

/** Filters accepted by the public excursion listing. */
export type TourFilters = {
  categorySlug?: string
  destinationSlug?: string
  channel?: string
  difficulty?: Difficulty
  minPriceCents?: number
  maxPriceCents?: number
  minDurationMinutes?: number
  maxDurationMinutes?: number
  availableOn?: string
  query?: string
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'duration-asc' | 'name-asc'
  page?: number
  pageSize?: number
}
