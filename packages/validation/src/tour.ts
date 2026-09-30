import { z } from 'zod'
import {
  centsSchema,
  contentStatusSchema,
  cuidSchema,
  isoDateSchema,
  priceAmountSchema,
  safeTextSchema,
  seoSchema,
  slugSchema,
  timeSchema,
} from './common.ts'

export const difficultySchema = z.enum(['EASY', 'MODERATE', 'CHALLENGING'])

export const tourOptionSchema = z.object({
  id: cuidSchema.optional(),
  name: safeTextSchema(2, 120, 'El nombre de la opción'),
  description: z.string().max(2000).optional(),
  /** Major units in the form; converted to cents before persisting. */
  price: priceAmountSchema,
  childPrice: priceAmountSchema.optional(),
  currency: z.string().length(3).default('ARS'),
  durationMinutes: z.number().int().min(15, 'Mínimo 15 minutos').max(20160),
  capacity: z.number().int().min(1).max(500),
  minParticipants: z.number().int().min(1).max(100).default(1),
  maxParticipants: z.number().int().min(1).max(500).default(20),
  pickupIncluded: z.boolean().default(false),
  departureTimes: z.array(timeSchema).max(24).default([]),
  freeCancellationHours: z.number().int().min(0).max(720).default(24),
  cancellationNote: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
})
  .refine((o) => o.maxParticipants >= o.minParticipants, {
    message: 'El máximo de participantes debe ser mayor o igual al mínimo',
    path: ['maxParticipants'],
  })
  .refine((o) => o.childPrice === undefined || o.childPrice <= o.price, {
    message: 'El precio de menores no puede superar el de adultos',
    path: ['childPrice'],
  })

export const itineraryStepSchema = z.object({
  id: cuidSchema.optional(),
  title: safeTextSchema(2, 160, 'El título del paso'),
  description: safeTextSchema(1, 2000, 'La descripción del paso'),
  timeLabel: z.string().max(60).optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const pickupLocationSchema = z.object({
  id: cuidSchema.optional(),
  name: safeTextSchema(2, 120, 'El nombre del punto de encuentro'),
  address: z.string().max(240).optional(),
  offsetMinutes: z.number().int().min(-300).max(300).default(0),
  extraCost: priceAmountSchema.default(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
})

export const tourFaqSchema = z.object({
  id: cuidSchema.optional(),
  question: safeTextSchema(4, 300, 'La pregunta'),
  answer: safeTextSchema(4, 3000, 'La respuesta'),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
})

export const tourSchema = z.object({
  name: safeTextSchema(3, 160, 'El nombre'),
  slug: slugSchema,
  summary: safeTextSchema(20, 300, 'El resumen'),
  description: safeTextSchema(50, 20000, 'La descripción'),
  status: contentStatusSchema.default('DRAFT'),

  categoryId: cuidSchema,
  destinationId: cuidSchema.optional().nullable(),

  durationMinutes: z.number().int().min(15).max(20160),
  difficulty: difficultySchema.default('EASY'),
  location: z.string().max(160).optional(),
  minAge: z.number().int().min(0).max(120).optional().nullable(),
  maxGroupSize: z.number().int().min(1).max(500).optional().nullable(),
  languages: z.array(z.string().min(1).max(40)).max(10).default(['Español']),

  highlights: z.array(z.string().min(1).max(200)).max(12).default([]),
  included: z.array(z.string().min(1).max(200)).max(30).default([]),
  excluded: z.array(z.string().min(1).max(200)).max(30).default([]),
  importantInfo: z.string().max(5000).optional(),
  cancellationPolicy: z.string().max(5000).optional(),

  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),

  options: z.array(tourOptionSchema).min(1, 'Agregá al menos una opción con precio'),
  itinerary: z.array(itineraryStepSchema).max(40).default([]),
  pickupLocations: z.array(pickupLocationSchema).max(60).default([]),
  faqs: z.array(tourFaqSchema).max(30).default([]),

  imageIds: z.array(cuidSchema).max(30).default([]),
  coverImageId: cuidSchema.optional().nullable(),
  videoIds: z.array(cuidSchema).max(10).default([]),
  relatedTourIds: z.array(cuidSchema).max(12).default([]),

  seo: seoSchema.optional(),
})

export type TourInput = z.infer<typeof tourSchema>
export type TourOptionInput = z.infer<typeof tourOptionSchema>

/** Bulk availability generation over a date range, used by the admin. */
export const availabilityGenerateSchema = z
  .object({
    optionId: cuidSchema,
    from: isoDateSchema,
    to: isoDateSchema,
    /** 0 = Sunday … 6 = Saturday. Empty means every day. */
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    departureTimes: z.array(timeSchema).max(24).default([]),
    seatsTotal: z.number().int().min(1).max(500),
    priceCentsOverride: centsSchema.optional().nullable(),
  })
  .refine((v) => v.from <= v.to, { message: 'La fecha final debe ser posterior', path: ['to'] })

export const availabilityUpdateSchema = z.object({
  id: cuidSchema,
  seatsTotal: z.number().int().min(0).max(500).optional(),
  priceCentsOverride: centsSchema.optional().nullable(),
  isBlocked: z.boolean().optional(),
})

export const tourCategorySchema = z.object({
  name: safeTextSchema(2, 100, 'El nombre'),
  slug: slugSchema,
  description: z.string().max(2000).optional(),
  channel: z.enum(['excursiones', 'traslados', 'servicios']).default('excursiones'),
  status: contentStatusSchema.default('PUBLISHED'),
  sortOrder: z.number().int().min(0).default(0),
  imageId: cuidSchema.optional().nullable(),
  seo: seoSchema.optional(),
})

/** Public listing filters. Everything is coerced from URL query strings. */
export const tourFiltersSchema = z.object({
  categoria: z.string().max(96).optional(),
  destino: z.string().max(96).optional(),
  dificultad: difficultySchema.optional(),
  precioMin: z.coerce.number().int().nonnegative().optional(),
  precioMax: z.coerce.number().int().nonnegative().optional(),
  duracionMin: z.coerce.number().int().nonnegative().optional(),
  duracionMax: z.coerce.number().int().nonnegative().optional(),
  fecha: isoDateSchema.optional(),
  q: z.string().max(120).optional(),
  orden: z.enum(['destacados', 'precio-asc', 'precio-desc', 'duracion-asc', 'nombre-asc']).default('destacados'),
  page: z.coerce.number().int().min(1).max(500).default(1),
})

export type TourFiltersInput = z.infer<typeof tourFiltersSchema>
