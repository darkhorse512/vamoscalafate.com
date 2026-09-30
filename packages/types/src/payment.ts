import type { PaymentProvider, PaymentStatus } from './models.ts'

/**
 * Payment provider abstraction.
 *
 * Components and server actions depend only on `PaymentGateway`. Provider
 * SDK details, signature schemes and payload shapes stay behind an
 * implementation in web/src/server/payments/providers.
 */

export type ProviderKey = 'mercadopago' | 'stripe'

export type CheckoutLineItem = {
  title: string
  description?: string
  quantity: number
  unitPriceCents: number
}

export type CreateCheckoutInput = {
  bookingId: string
  bookingReference: string
  amountCents: number
  currency: string
  items: CheckoutLineItem[]
  customer: { email: string; firstName: string; lastName: string; phone?: string }
  /** Where the provider returns the customer. Purely informational: payment is
   *  only ever confirmed by a verified webhook, never by this redirect. */
  successUrl: string
  failureUrl: string
  pendingUrl: string
}

export type CheckoutSession = {
  provider: PaymentProvider
  /** Provider-side id persisted on the Payment row for reconciliation. */
  providerReferenceId: string
  checkoutUrl: string
  amountCents: number
  currency: string
}

/** Normalised result of verifying and parsing an inbound webhook. */
export type WebhookResult = {
  /** Stable provider event id - the idempotency key. */
  eventId: string
  eventType: string
  bookingReference: string | null
  providerPaymentId: string | null
  status: PaymentStatus
  amountCents: number | null
  currency: string | null
  failureReason?: string
  refundedCents?: number
  raw: unknown
}

export type RefundInput = {
  providerPaymentId: string
  amountCents: number
  reason?: string
}

export type RefundResult = {
  refundId: string
  refundedCents: number
  status: PaymentStatus
}

export interface PaymentGateway {
  readonly key: ProviderKey
  readonly provider: PaymentProvider
  /** False when credentials are missing - checkout then hides the option. */
  isConfigured(): boolean
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>
  /**
   * Verifies the signature over the RAW request body and parses it.
   * Throws when verification fails; the route must then answer 400 and must
   * not mutate any booking.
   */
  verifyAndParseWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>
  refund(input: RefundInput): Promise<RefundResult>
}
