import { z } from 'zod'
import {
  cuidSchema,
  emailSchema,
  honeypotSchema,
  isoDateSchema,
  phoneSchema,
  safeTextSchema,
  timeSchema,
} from './common.ts'

/** What the customer picks on the tour page before entering personal data. */
export const bookingSelectionSchema = z
  .object({
    tourId: cuidSchema,
    optionId: cuidSchema,
    date: isoDateSchema,
    departureTime: timeSchema.optional().nullable(),
    adults: z.number().int().min(1, 'Se requiere al menos un adulto').max(50),
    children: z.number().int().min(0).max(50).default(0),
    pickupLocationId: cuidSchema.optional().nullable(),
  })
  .refine((v) => v.adults + v.children <= 50, {
    message: 'Para grupos de más de 50 personas, contactanos directamente',
    path: ['adults'],
  })
  .refine(
    (v) => {
      // Departures are sold up to the end of the selected day, never earlier.
      const today = new Date().toISOString().slice(0, 10)
      return v.date >= today
    },
    { message: 'Elegí una fecha a partir de hoy', path: ['date'] },
  )

/** Section 18: only what is operationally necessary is collected. */
export const customerSchema = z.object({
  firstName: safeTextSchema(2, 60, 'El nombre'),
  lastName: safeTextSchema(2, 60, 'El apellido'),
  email: emailSchema,
  phone: phoneSchema,
  country: safeTextSchema(2, 60, 'El país'),
  hotelName: z.string().max(160).optional(),
  specialRequests: z.string().max(1000).optional(),
  marketingOptIn: z.boolean().default(false),
})

export const passengerSchema = z.object({
  firstName: safeTextSchema(1, 60, 'El nombre'),
  lastName: safeTextSchema(1, 60, 'El apellido'),
  type: z.enum(['ADULT', 'CHILD', 'INFANT', 'SENIOR']).default('ADULT'),
  nationality: z.string().max(60).optional(),
})

/**
 * UTM values arrive from the URL and are persisted, so they are length-capped
 * and stripped of control characters like any other untrusted input.
 */
export const attributionSchema = z.object({
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(160).optional(),
  utmTerm: z.string().max(160).optional(),
  utmContent: z.string().max(160).optional(),
  referrer: z.string().max(500).optional(),
})

export const bookingSchema = z.object({
  selection: bookingSelectionSchema,
  customer: customerSchema,
  passengers: z.array(passengerSchema).max(50).default([]),
  attribution: attributionSchema.optional(),
  website: honeypotSchema,
  acceptedTerms: z
    .boolean()
    .refine((v) => v === true, 'Debés aceptar los términos y la política de cancelación'),
})

export type BookingInput = z.infer<typeof bookingSchema>
export type CustomerInput = z.infer<typeof customerSchema>

export const bookingStatusSchema = z.enum([
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'REFUNDED',
])

/** Admin-side status change. A reason is mandatory when cancelling. */
export const bookingStatusUpdateSchema = z
  .object({
    bookingId: cuidSchema,
    status: bookingStatusSchema,
    reason: z.string().max(500).optional(),
    internalNotes: z.string().max(2000).optional(),
    notifyCustomer: z.boolean().default(true),
  })
  .refine((v) => v.status !== 'CANCELLED' || (v.reason?.trim().length ?? 0) > 0, {
    message: 'Indicá el motivo de la cancelación',
    path: ['reason'],
  })

export const refundRequestSchema = z.object({
  paymentId: cuidSchema,
  /** Minor units. Must not exceed the captured amount; checked server-side. */
  amountCents: z.number().int().positive('El importe a reembolsar debe ser mayor a cero'),
  reason: safeTextSchema(3, 500, 'El motivo'),
})

export const checkoutStartSchema = z.object({
  bookingId: cuidSchema,
  provider: z.enum(['mercadopago', 'stripe']),
})

export const availabilityQuerySchema = z
  .object({
    tourId: cuidSchema,
    optionId: cuidSchema.optional(),
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((v) => v.from <= v.to, { message: 'Rango de fechas inválido', path: ['to'] })
  .refine(
    (v) => {
      const days =
        (Date.parse(`${v.to}T00:00:00Z`) - Date.parse(`${v.from}T00:00:00Z`)) / 86_400_000
      return days <= 370
    },
    { message: 'El rango no puede superar un año', path: ['to'] },
  )
