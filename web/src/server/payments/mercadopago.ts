import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError, centsToProviderAmount, logger, serverEnv } from '@vamos/shared'
import type {
  CheckoutSession, CreateCheckoutInput, PaymentGateway,
  RefundInput, RefundResult, WebhookResult,
} from '@vamos/types'

const log = logger.scoped('mercadopago')
const API = 'https://api.mercadopago.com'

/**
 * Mercado Pago Checkout Pro.
 *
 * REQUIRED EXTERNAL CONFIGURATION
 *   · MERCADOPAGO_ACCESS_TOKEN   — Credenciales de producción in the developer panel
 *   · MERCADOPAGO_WEBHOOK_SECRET — the signing secret shown when the webhook is created
 *   · Webhook URL: https://vamoscalafate.com/api/webhooks/mercadopago  (topic: payment)
 *
 * Talks to the REST API over fetch rather than pulling in the SDK: two
 * endpoints are used, and this keeps the server bundle small and the
 * signature verification explicit.
 */
export class MercadoPagoGateway implements PaymentGateway {
  readonly key = 'mercadopago' as const
  readonly provider = 'MERCADOPAGO' as const

  isConfigured(): boolean {
    const env = serverEnv()
    return Boolean(env.MERCADOPAGO_ACCESS_TOKEN && env.MERCADOPAGO_WEBHOOK_SECRET)
  }

  private token(): string {
    const token = serverEnv().MERCADOPAGO_ACCESS_TOKEN
    if (!token) {
      throw new AppError('PROVIDER_NOT_CONFIGURED', 'MERCADOPAGO_ACCESS_TOKEN is not set')
    }
    return token
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const body = {
      items: input.items.map((item) => ({
        title: item.title.slice(0, 256),
        description: item.description?.slice(0, 256),
        quantity: item.quantity,
        unit_price: centsToProviderAmount(item.unitPriceCents),
        currency_id: input.currency,
      })),
      payer: {
        name: input.customer.firstName,
        surname: input.customer.lastName,
        email: input.customer.email,
      },
      // Echoed back on the webhook — how a notification is matched to a booking.
      external_reference: input.bookingReference,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: 'approved',
      binary_mode: false,
      statement_descriptor: 'VAMOSCALAFATE',
      notification_url: `${serverEnv().NODE_ENV === 'production' ? '' : ''}${input.successUrl.split('/checkout')[0]}/api/webhooks/mercadopago`,
    }

    const response = await fetch(`${API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token()}`,
        'Content-Type': 'application/json',
        // Prevents a retried request from creating a duplicate preference.
        'X-Idempotency-Key': `pref-${input.bookingReference}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const detail = await response.text()
      log.error('Preference creation failed', undefined, { status: response.status, detail })
      throw new AppError('PAYMENT_ERROR', `Mercado Pago responded ${response.status}`)
    }

    const preference = (await response.json()) as {
      id: string
      init_point?: string
      sandbox_init_point?: string
    }

    const checkoutUrl =
      serverEnv().NODE_ENV === 'production'
        ? preference.init_point
        : (preference.sandbox_init_point ?? preference.init_point)

    if (!checkoutUrl) {
      throw new AppError('PAYMENT_ERROR', 'Mercado Pago returned no checkout URL')
    }

    return {
      provider: this.provider,
      providerReferenceId: preference.id,
      checkoutUrl,
      amountCents: input.amountCents,
      currency: input.currency,
    }
  }

  /**
   * Verifies the `x-signature` header.
   *
   * Mercado Pago signs a manifest built from the resource id, the request id
   * and the timestamp — NOT the raw body. The manifest template is fixed by
   * the provider: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
   */
  async verifyAndParseWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    const env = serverEnv()
    const secret = env.MERCADOPAGO_WEBHOOK_SECRET
    if (!secret) {
      throw new AppError('PROVIDER_NOT_CONFIGURED', 'MERCADOPAGO_WEBHOOK_SECRET is not set')
    }

    const signatureHeader = headers.get('x-signature')
    const requestId = headers.get('x-request-id') ?? ''
    if (!signatureHeader) {
      throw new AppError('UNAUTHORIZED', 'Missing x-signature header')
    }

    const parts = Object.fromEntries(
      signatureHeader.split(',').map((part) => {
        const [k, ...rest] = part.split('=')
        return [k?.trim() ?? '', rest.join('=').trim()]
      }),
    )
    const ts = parts.ts
    const receivedHash = parts.v1
    if (!ts || !receivedHash) {
      throw new AppError('UNAUTHORIZED', 'Malformed x-signature header')
    }

    // Reject stale signatures: a captured notification must not be replayable
    // indefinitely. 10-minute window.
    const age = Math.abs(Date.now() - Number(ts) * 1000)
    if (!Number.isFinite(age) || age > 10 * 60 * 1000) {
      throw new AppError('UNAUTHORIZED', 'Webhook signature timestamp outside accepted window')
    }

    const payload = JSON.parse(rawBody) as {
      id?: string | number
      type?: string
      action?: string
      data?: { id?: string | number }
    }

    const dataId = String(payload.data?.id ?? '')
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
    const expected = createHmac('sha256', secret).update(manifest).digest('hex')

    const expectedBuffer = Buffer.from(expected, 'hex')
    const receivedBuffer = Buffer.from(receivedHash, 'hex')

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new AppError('UNAUTHORIZED', 'Webhook signature mismatch')
    }

    // The notification carries only an id, so the authoritative payment state
    // is fetched from the API. Never trust amounts or status from the body.
    const paymentResponse = await fetch(`${API}/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${this.token()}` },
    })

    if (!paymentResponse.ok) {
      throw new AppError('PAYMENT_ERROR', `Could not fetch payment ${dataId}`)
    }

    const payment = (await paymentResponse.json()) as {
      id: number
      status: string
      status_detail?: string
      external_reference?: string
      transaction_amount?: number
      currency_id?: string
      transaction_amount_refunded?: number
    }

    const statusMap: Record<string, WebhookResult['status']> = {
      approved: 'APPROVED',
      authorized: 'APPROVED',
      pending: 'PENDING',
      in_process: 'PENDING',
      in_mediation: 'PENDING',
      rejected: 'REJECTED',
      cancelled: 'CANCELLED',
      refunded: 'REFUNDED',
      charged_back: 'REFUNDED',
    }

    return {
      eventId: `mp-${payment.id}-${payment.status}`,
      eventType: payload.type ?? payload.action ?? 'payment',
      bookingReference: payment.external_reference ?? null,
      providerPaymentId: String(payment.id),
      status: statusMap[payment.status] ?? 'PENDING',
      amountCents:
        payment.transaction_amount !== undefined
          ? Math.round(payment.transaction_amount * 100)
          : null,
      currency: payment.currency_id ?? null,
      failureReason: payment.status_detail,
      refundedCents: payment.transaction_amount_refunded
        ? Math.round(payment.transaction_amount_refunded * 100)
        : 0,
      raw: payment,
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const response = await fetch(`${API}/v1/payments/${input.providerPaymentId}/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `refund-${input.providerPaymentId}-${input.amountCents}`,
      },
      body: JSON.stringify({ amount: centsToProviderAmount(input.amountCents) }),
    })

    if (!response.ok) {
      const detail = await response.text()
      log.error('Refund failed', undefined, { status: response.status, detail })
      throw new AppError('PAYMENT_ERROR', 'No se pudo procesar el reembolso en Mercado Pago')
    }

    const refund = (await response.json()) as { id: number; amount: number; status: string }

    return {
      refundId: String(refund.id),
      refundedCents: Math.round(refund.amount * 100),
      status: refund.status === 'approved' ? 'REFUNDED' : 'PENDING',
    }
  }
}
