import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError, centsForStripe, logger, serverEnv } from '@vamos/shared'
import type {
  CheckoutSession, CreateCheckoutInput, PaymentGateway,
  RefundInput, RefundResult, WebhookResult,
} from '@vamos/types'

const log = logger.scoped('stripe')
const API = 'https://api.stripe.com/v1'

/**
 * Stripe Checkout.
 *
 * REQUIRED EXTERNAL CONFIGURATION
 *   · STRIPE_SECRET_KEY     - https://dashboard.stripe.com/apikeys
 *   · STRIPE_WEBHOOK_SECRET - the `whsec_...` shown when the endpoint is created
 *   · Webhook URL: https://vamoscalafate.com/api/webhooks/stripe
 *     Events: checkout.session.completed, checkout.session.expired,
 *             charge.refunded, payment_intent.payment_failed
 *
 * Uses the REST API directly. Stripe's form-encoded body format is handled by
 * `toFormBody` below, which flattens nested objects into bracket notation.
 */

function toFormBody(data: Record<string, unknown>, prefix = ''): string {
  const params: string[] = []

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue
    const fullKey = prefix ? `${prefix}[${key}]` : key

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          params.push(toFormBody(item as Record<string, unknown>, `${fullKey}[${index}]`))
        } else {
          params.push(`${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else if (typeof value === 'object') {
      params.push(toFormBody(value as Record<string, unknown>, fullKey))
    } else {
      params.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`)
    }
  }

  return params.filter(Boolean).join('&')
}

/** Stripe treats these currencies as having no minor unit. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'XOF', 'XAF', 'BIF', 'DJF'])

function stripeAmount(cents: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase())
    ? Math.round(cents / 100)
    : centsForStripe(cents)
}

export class StripeGateway implements PaymentGateway {
  readonly key = 'stripe' as const
  readonly provider = 'STRIPE' as const

  isConfigured(): boolean {
    const env = serverEnv()
    return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
  }

  private secretKey(): string {
    const key = serverEnv().STRIPE_SECRET_KEY
    if (!key) throw new AppError('PROVIDER_NOT_CONFIGURED', 'STRIPE_SECRET_KEY is not set')
    return key
  }

  private async request(path: string, body: Record<string, unknown>, idempotencyKey?: string) {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: toFormBody(body),
    })

    if (!response.ok) {
      const detail = await response.text()
      log.error('Stripe API error', undefined, { path, status: response.status, detail })
      throw new AppError('PAYMENT_ERROR', `Stripe responded ${response.status}`)
    }

    return response.json()
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const session = (await this.request(
      '/checkout/sessions',
      {
        mode: 'payment',
        customer_email: input.customer.email,
        // Echoed on the webhook - how a session is matched to a booking.
        client_reference_id: input.bookingReference,
        metadata: { bookingReference: input.bookingReference, bookingId: input.bookingId },
        payment_intent_data: {
          metadata: { bookingReference: input.bookingReference },
        },
        line_items: input.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: stripeAmount(item.unitPriceCents, input.currency),
            product_data: {
              name: item.title.slice(0, 250),
              ...(item.description ? { description: item.description.slice(0, 250) } : {}),
            },
          },
        })),
        success_url: input.successUrl,
        cancel_url: input.failureUrl,
        // Abandoned sessions expire so held seats are freed by the reaper.
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      `checkout-${input.bookingReference}`,
    )) as { id: string; url?: string }

    if (!session.url) throw new AppError('PAYMENT_ERROR', 'Stripe returned no checkout URL')

    return {
      provider: this.provider,
      providerReferenceId: session.id,
      checkoutUrl: session.url,
      amountCents: input.amountCents,
      currency: input.currency,
    }
  }

  /**
   * Verifies the `Stripe-Signature` header against the RAW request body.
   *
   * The body must be the exact bytes Stripe sent - parsing and re-serialising
   * it first would change the JSON and invalidate every signature.
   */
  async verifyAndParseWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    const secret = serverEnv().STRIPE_WEBHOOK_SECRET
    if (!secret) {
      throw new AppError('PROVIDER_NOT_CONFIGURED', 'STRIPE_WEBHOOK_SECRET is not set')
    }

    const signatureHeader = headers.get('stripe-signature')
    if (!signatureHeader) throw new AppError('UNAUTHORIZED', 'Missing stripe-signature header')

    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => {
        const [k, ...rest] = p.split('=')
        return [k?.trim() ?? '', rest.join('=').trim()]
      }),
    )

    const timestamp = parts.t
    const signature = parts.v1
    if (!timestamp || !signature) throw new AppError('UNAUTHORIZED', 'Malformed stripe-signature')

    // 5-minute tolerance, matching Stripe's own recommendation.
    const age = Math.abs(Date.now() / 1000 - Number(timestamp))
    if (!Number.isFinite(age) || age > 300) {
      throw new AppError('UNAUTHORIZED', 'Webhook timestamp outside tolerance')
    }

    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')

    const expectedBuffer = Buffer.from(expected, 'hex')
    const receivedBuffer = Buffer.from(signature, 'hex')

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new AppError('UNAUTHORIZED', 'Webhook signature mismatch')
    }

    const event = JSON.parse(rawBody) as {
      id: string
      type: string
      data: { object: Record<string, unknown> }
    }

    const object = event.data.object
    const currency = typeof object.currency === 'string' ? object.currency.toUpperCase() : null

    const rawAmount =
      typeof object.amount_total === 'number'
        ? object.amount_total
        : typeof object.amount === 'number'
          ? object.amount
          : null

    const amountCents =
      rawAmount === null
        ? null
        : ZERO_DECIMAL.has(currency ?? '')
          ? rawAmount * 100
          : rawAmount

    const metadata = (object.metadata ?? {}) as Record<string, string | undefined>
    const bookingReference =
      (typeof object.client_reference_id === 'string' ? object.client_reference_id : null) ??
      metadata.bookingReference ??
      null

    const statusByEvent: Record<string, WebhookResult['status']> = {
      'checkout.session.completed': 'APPROVED',
      'checkout.session.async_payment_succeeded': 'APPROVED',
      'checkout.session.expired': 'CANCELLED',
      'checkout.session.async_payment_failed': 'REJECTED',
      'payment_intent.payment_failed': 'REJECTED',
      'payment_intent.canceled': 'CANCELLED',
      'charge.refunded': 'REFUNDED',
    }

    const paymentIntent =
      typeof object.payment_intent === 'string'
        ? object.payment_intent
        : typeof object.id === 'string'
          ? object.id
          : null

    return {
      eventId: event.id,
      eventType: event.type,
      bookingReference,
      providerPaymentId: paymentIntent,
      status: statusByEvent[event.type] ?? 'PENDING',
      amountCents,
      currency,
      failureReason:
        typeof object.last_payment_error === 'object' && object.last_payment_error !== null
          ? String((object.last_payment_error as { message?: string }).message ?? '')
          : undefined,
      refundedCents:
        typeof object.amount_refunded === 'number' ? object.amount_refunded : 0,
      raw: event,
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refund = (await this.request(
      '/refunds',
      {
        payment_intent: input.providerPaymentId,
        amount: input.amountCents,
        ...(input.reason ? { metadata: { reason: input.reason.slice(0, 250) } } : {}),
      },
      `refund-${input.providerPaymentId}-${input.amountCents}`,
    )) as { id: string; amount: number; status: string }

    return {
      refundId: refund.id,
      refundedCents: refund.amount,
      status: refund.status === 'succeeded' ? 'REFUNDED' : 'PENDING',
    }
  }
}
