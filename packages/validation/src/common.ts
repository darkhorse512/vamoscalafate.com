import { z } from 'zod'

/**
 * Primitives reused across every schema.
 *
 * These are the server-side contract. Client-side validation exists purely to
 * give fast feedback — every mutation re-parses its input with these schemas
 * before touching the database.
 */

export const cuidSchema = z.string().min(1, 'Identificador requerido')

export const slugSchema = z
  .string()
  .min(1, 'El slug es obligatorio')
  .max(96, 'El slug es demasiado largo')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones')

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El email es obligatorio')
  .max(254, 'El email es demasiado largo')
  .email('Ingresá un email válido')

/** Permissive on formatting (international visitors), strict on length. */
export const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Ingresá un teléfono válido')
  .max(32, 'El teléfono es demasiado largo')
  .regex(/^[+]?[\d\s()-]+$/, 'El teléfono solo puede contener números y + ( ) -')

export const optionalPhoneSchema = z.union([phoneSchema, z.literal('')]).optional()

/** Blocks javascript: and data: URLs that would otherwise become XSS vectors. */
export const urlSchema = z
  .string()
  .trim()
  .url('Ingresá una URL válida')
  .max(2048, 'La URL es demasiado larga')
  .refine((v) => /^https?:\/\//i.test(v), 'La URL debe comenzar con http:// o https://')

export const optionalUrlSchema = z.union([urlSchema, z.literal('')]).optional()

/** Money entered by an admin, in major units, stored as minor units. */
export const priceAmountSchema = z
  .number({ message: 'Ingresá un importe válido' })
  .nonnegative('El importe no puede ser negativo')
  .max(100_000_000, 'El importe es demasiado alto')

export const centsSchema = z
  .number()
  .int('El importe debe ser un entero de centavos')
  .nonnegative('El importe no puede ser negativo')

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Fecha inválida')

export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:MM')

export const currencySchema = z
  .string()
  .length(3, 'El código de moneda debe tener 3 letras')
  .toUpperCase()

export const contentStatusSchema = z.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'])

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
})

/**
 * Honeypot field. Real users never see or fill it; most naive bots do.
 * A non-empty value means the submission is discarded silently.
 */
export const honeypotSchema = z
  .string()
  .max(0, 'Solicitud rechazada')
  .optional()
  .or(z.literal(''))

/** Collapses whitespace and strips control characters from free text. */
export function sanitizeText(input: string): string {
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
}

export const safeTextSchema = (min: number, max: number, label = 'Este campo') =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(min, `${label} debe tener al menos ${min} caracteres`)
        .max(max, `${label} no puede superar ${max} caracteres`),
    )

export const seoSchema = z.object({
  title: z.string().max(70, 'El título SEO no debería superar 70 caracteres').optional(),
  description: z
    .string()
    .max(180, 'La descripción SEO no debería superar 180 caracteres')
    .optional(),
  canonicalUrl: optionalUrlSchema,
  ogTitle: z.string().max(90).optional(),
  ogDescription: z.string().max(200).optional(),
  ogImageUrl: optionalUrlSchema,
  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),
})

export type SeoInput = z.infer<typeof seoSchema>
