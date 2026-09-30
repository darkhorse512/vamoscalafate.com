import { z } from 'zod'

/**
 * Fail-fast environment validation.
 *
 * Parsed once at module load on the server. A missing AUTH_SECRET or
 * DATABASE_URL should crash the process at boot, not surface as a confusing
 * 500 during a customer's checkout.
 *
 * Only `NEXT_PUBLIC_*` values are safe to reference from client components;
 * everything else is server-only and must never be imported into a
 * `'use client'` module. `publicEnv` below is the only client-safe export.
 */

const nonEmpty = (name: string) => z.string().min(1, `${name} is required`)

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: nonEmpty('DATABASE_URL').startsWith(
    'postgres',
    'DATABASE_URL must be a PostgreSQL connection string',
  ),

  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters. Generate: openssl rand -base64 48'),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(28800),
  AUTH_COOKIE_DOMAIN: z.string().optional(),

  EMAIL_TRANSPORT: z.enum(['smtp', 'console']).default('console'),
  RESEND_SMTP_HOST: z.string().default('smtp.resend.com'),
  RESEND_SMTP_PORT: z.coerce.number().int().positive().default(465),
  RESEND_SMTP_USERNAME: z.string().default('resend'),
  RESEND_SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('Vamos Calafate <reservas@vamoscalafate.com>'),
  EMAIL_REPLY_TO: z.string().optional(),
  EMAIL_ADMIN: z.string().optional(),

  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PAYMENT_DEFAULT_PROVIDER: z.enum(['mercadopago', 'stripe']).default('mercadopago'),
  DEFAULT_CURRENCY: z.string().length(3).default('ARS'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage/media'),
  STORAGE_PUBLIC_URL: z.string().default('/media'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  REVALIDATE_SECRET: z.string().min(16, 'REVALIDATE_SECRET must be at least 16 characters'),
})

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url('NEXT_PUBLIC_SITE_URL must be an absolute URL'),
  NEXT_PUBLIC_ADMIN_URL: z.url('NEXT_PUBLIC_ADMIN_URL must be an absolute URL'),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_GSC_VERIFICATION: z.string().optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  NEXT_PUBLIC_CONTACT_PHONE: z.string().optional(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>
export type PublicEnv = z.infer<typeof publicSchema>

function formatIssues(issues: z.core.$ZodIssue[]): string {
  return issues.map((i) => `  · ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')
}

/**
 * Public values are inlined by Next.js at build time, so they must be read as
 * complete literal property accesses rather than through a dynamic key.
 */
const rawPublicEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001',
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  NEXT_PUBLIC_GSC_VERIFICATION: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_CONTACT_PHONE: process.env.NEXT_PUBLIC_CONTACT_PHONE,
  NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
}

const publicParsed = publicSchema.safeParse(rawPublicEnv)

if (!publicParsed.success) {
  throw new Error(
    `Invalid public environment configuration:\n${formatIssues(publicParsed.error.issues)}`,
  )
}

/** Safe to import from client components. */
export const publicEnv: PublicEnv = publicParsed.data

let cachedServerEnv: ServerEnv | null = null

/**
 * Server-only environment accessor.
 *
 * Lazy rather than module-level so that importing this file from a client
 * bundle (where secrets are absent) cannot throw at import time - the throw
 * only happens if server code actually asks for a server value.
 */
export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv

  if (typeof globalThis === 'object' && 'window' in globalThis) {
    throw new Error('serverEnv() was called in the browser. Server secrets are not available there.')
  }

  const parsed = serverSchema.safeParse(process.env)

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment configuration:\n${formatIssues(parsed.error.issues)}\n\n` +
        'Copy .env.example to .env and fill in the required values.',
    )
  }

  cachedServerEnv = parsed.data
  return cachedServerEnv
}

/** True when the given payment provider has complete credentials configured. */
export function isPaymentProviderConfigured(provider: 'mercadopago' | 'stripe'): boolean {
  const env = serverEnv()
  if (provider === 'mercadopago') {
    return Boolean(env.MERCADOPAGO_ACCESS_TOKEN && env.MERCADOPAGO_WEBHOOK_SECRET)
  }
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
}

/** True when real email delivery is configured. Otherwise mail is logged only. */
export function isEmailConfigured(): boolean {
  const env = serverEnv()
  return env.EMAIL_TRANSPORT === 'smtp' && Boolean(env.RESEND_SMTP_PASSWORD)
}
