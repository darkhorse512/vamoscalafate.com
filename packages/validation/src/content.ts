import { z } from 'zod'
import {
  contentStatusSchema,
  cuidSchema,
  emailSchema,
  honeypotSchema,
  optionalPhoneSchema,
  optionalUrlSchema,
  phoneSchema,
  safeTextSchema,
  seoSchema,
  slugSchema,
  urlSchema,
} from './common.ts'

// ── Blog ────────────────────────────────────────────────────────────────────

export const blogPostSchema = z.object({
  title: safeTextSchema(5, 180, 'El título'),
  slug: slugSchema,
  excerpt: safeTextSchema(20, 320, 'El extracto'),
  content: safeTextSchema(100, 100_000, 'El contenido'),
  status: contentStatusSchema.default('DRAFT'),
  heroImageId: cuidSchema.optional().nullable(),
  categoryId: cuidSchema.optional().nullable(),
  destinationId: cuidSchema.optional().nullable(),
  tagIds: z.array(cuidSchema).max(12).default([]),
  featured: z.boolean().default(false),
  /** ISO datetime. A future value schedules the post. */
  publishedAt: z.string().datetime({ offset: true }).optional().nullable(),
  faqs: z
    .array(
      z.object({
        id: cuidSchema.optional(),
        question: safeTextSchema(4, 300, 'La pregunta'),
        answer: safeTextSchema(4, 3000, 'La respuesta'),
        sortOrder: z.number().int().min(0).default(0),
      }),
    )
    .max(20)
    .default([]),
  seo: seoSchema.optional(),
})

export const blogCategorySchema = z.object({
  name: safeTextSchema(2, 80, 'El nombre'),
  slug: slugSchema,
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const blogTagSchema = z.object({
  name: safeTextSchema(2, 60, 'El nombre'),
  slug: slugSchema,
})

// ── Destinations & attractions ──────────────────────────────────────────────

export const destinationSchema = z.object({
  name: safeTextSchema(2, 120, 'El nombre'),
  slug: slugSchema,
  shortIntro: safeTextSchema(20, 300, 'La introducción'),
  description: safeTextSchema(50, 40_000, 'La descripción'),
  status: contentStatusSchema.default('DRAFT'),
  region: z.string().max(80).default('Santa Cruz'),
  country: z.string().max(80).default('Argentina'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  heroImageId: cuidSchema.optional().nullable(),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  seo: seoSchema.optional(),
})

export const attractionSchema = z.object({
  name: safeTextSchema(2, 120, 'El nombre'),
  slug: slugSchema,
  summary: safeTextSchema(20, 300, 'El resumen'),
  description: safeTextSchema(50, 20_000, 'La descripción'),
  status: contentStatusSchema.default('DRAFT'),
  destinationId: cuidSchema,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  openingInfo: z.string().max(500).optional(),
  entryFeeInfo: z.string().max(500).optional(),
  imageId: cuidSchema.optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
})

// ── Hotels & businesses ─────────────────────────────────────────────────────

export const hotelSchema = z.object({
  name: safeTextSchema(2, 160, 'El nombre'),
  slug: slugSchema,
  summary: safeTextSchema(20, 300, 'El resumen'),
  description: safeTextSchema(50, 20_000, 'La descripción'),
  status: contentStatusSchema.default('DRAFT'),
  starRating: z.number().int().min(1).max(5).optional().nullable(),
  address: z.string().max(240).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: optionalPhoneSchema,
  email: z.union([emailSchema, z.literal('')]).optional(),
  website: optionalUrlSchema,
  fromPrice: z.number().nonnegative().optional().nullable(),
  destinationId: cuidSchema.optional().nullable(),
  amenityIds: z.array(cuidSchema).max(60).default([]),
  imageIds: z.array(cuidSchema).max(30).default([]),
  coverImageId: cuidSchema.optional().nullable(),
  featured: z.boolean().default(false),
  seo: seoSchema.optional(),
})

export const businessSchema = z.object({
  name: safeTextSchema(2, 160, 'El nombre'),
  slug: slugSchema,
  summary: safeTextSchema(20, 300, 'El resumen'),
  description: safeTextSchema(50, 20_000, 'La descripción'),
  status: contentStatusSchema.default('DRAFT'),
  categoryId: cuidSchema,
  destinationId: cuidSchema.optional().nullable(),
  address: z.string().max(240).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: optionalPhoneSchema,
  email: z.union([emailSchema, z.literal('')]).optional(),
  website: optionalUrlSchema,
  openingHours: z.record(z.string(), z.string().max(80)).optional(),
  services: z.array(z.string().min(1).max(120)).max(40).default([]),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']).optional(),
  imageIds: z.array(cuidSchema).max(30).default([]),
  coverImageId: cuidSchema.optional().nullable(),
  featured: z.boolean().default(false),
  seo: seoSchema.optional(),
})

/**
 * Public hotel/business listing request.
 *
 * Applicants supply image and video URLs rather than uploads: the server never
 * fetches them, which removes an SSRF surface, and an admin reviews them
 * before anything is published.
 */
export const hotelSubmissionSchema = z.object({
  kind: z.enum(['HOTEL', 'BUSINESS']).default('HOTEL'),
  businessName: safeTextSchema(2, 160, 'El nombre del establecimiento'),
  contactName: safeTextSchema(2, 120, 'El nombre de contacto'),
  email: emailSchema,
  phone: phoneSchema,
  website: optionalUrlSchema,
  address: z.string().max(240).optional(),
  description: safeTextSchema(50, 5000, 'La descripción'),
  amenities: z.array(z.string().min(1).max(80)).max(40).default([]),
  services: z.array(z.string().min(1).max(80)).max(40).default([]),
  openingHours: z.string().max(500).optional(),
  imageUrls: z.array(urlSchema).max(12, 'Máximo 12 imágenes').default([]),
  videoUrls: z.array(urlSchema).max(4, 'Máximo 4 videos').default([]),
  extraInfo: z.string().max(2000).optional(),
  website_hp: honeypotSchema,
  acceptedTerms: z
    .boolean()
    .refine((v) => v === true, 'Debés aceptar los términos para enviar la solicitud'),
})

export type HotelSubmissionInput = z.infer<typeof hotelSubmissionSchema>

export const submissionReviewSchema = z
  .object({
    submissionId: cuidSchema,
    status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_INFORMATION']),
    reviewNotes: z.string().max(2000).optional(),
    notifyApplicant: z.boolean().default(true),
  })
  .refine(
    (v) =>
      !['REJECTED', 'NEEDS_INFORMATION'].includes(v.status) ||
      (v.reviewNotes?.trim().length ?? 0) >= 10,
    {
      message: 'Explicá el motivo - se incluye en el email al solicitante',
      path: ['reviewNotes'],
    },
  )

// ── Contact, reviews, FAQ, pages, settings ──────────────────────────────────

export const contactSchema = z.object({
  name: safeTextSchema(2, 120, 'El nombre'),
  email: emailSchema,
  phone: optionalPhoneSchema,
  subject: safeTextSchema(3, 160, 'El asunto'),
  message: safeTextSchema(10, 3000, 'El mensaje'),
  tourSlug: z.string().max(96).optional(),
  utmSource: z.string().max(120).optional(),
  utmCampaign: z.string().max(160).optional(),
  website: honeypotSchema,
  acceptedPrivacy: z
    .boolean()
    .refine((v) => v === true, 'Debés aceptar la política de privacidad'),
})

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Elegí una puntuación').max(5),
  title: z.string().max(160).optional(),
  content: safeTextSchema(20, 3000, 'La reseña'),
  authorName: safeTextSchema(2, 120, 'Tu nombre'),
  authorCountry: z.string().max(80).optional(),
  tourId: cuidSchema.optional(),
  hotelId: cuidSchema.optional(),
  businessId: cuidSchema.optional(),
  website: honeypotSchema,
})

export const reviewModerationSchema = z.object({
  reviewId: cuidSchema,
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  moderationNotes: z.string().max(1000).optional(),
})

export const faqSchema = z.object({
  scope: z.enum(['GLOBAL', 'TOUR', 'DESTINATION', 'BLOG', 'BOOKING']).default('GLOBAL'),
  question: safeTextSchema(4, 300, 'La pregunta'),
  answer: safeTextSchema(4, 3000, 'La respuesta'),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
  tourId: cuidSchema.optional().nullable(),
  destinationId: cuidSchema.optional().nullable(),
  blogPostId: cuidSchema.optional().nullable(),
})

export const staticPageSchema = z.object({
  title: safeTextSchema(3, 160, 'El título'),
  slug: slugSchema,
  content: safeTextSchema(20, 200_000, 'El contenido'),
  status: contentStatusSchema.default('PUBLISHED'),
  seo: seoSchema.optional(),
})

export const siteSettingSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.unknown(),
  group: z.string().max(40).default('general'),
  label: z.string().max(120),
})

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(120),
  tipo: z.enum(['todo', 'tour', 'hotel', 'business', 'blog', 'destination']).default('todo'),
})
