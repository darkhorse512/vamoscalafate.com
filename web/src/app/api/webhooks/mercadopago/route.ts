import { NextResponse } from 'next/server'
import { logger } from '@vamos/shared'
import { getGatewayUnchecked } from '@/server/payments'
import { paymentService } from '@/server/services/payment'

const log = logger.scoped('webhook:mercadopago')

/**
 * Mercado Pago webhook receiver.
 *
 * REQUIRED EXTERNAL CONFIGURATION
 *   Webhook URL: https://vamoscalafate.com/api/webhooks/mercadopago
 *   Topic: payment
 *   Secret: MERCADOPAGO_WEBHOOK_SECRET
 *
 * Response contract:
 *   200 — processed, or a duplicate we have already handled
 *   400 — signature invalid; the provider must NOT retry
 *   500 — transient failure; the provider SHOULD retry
 *
 * The body is read as raw text: signature verification depends on the exact
 * bytes sent, and re-serialising parsed JSON would break it.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const gateway = getGatewayUnchecked('mercadopago')

  if (!gateway?.isConfigured()) {
    log.warn('Webhook received but Mercado Pago is not configured')
    return NextResponse.json({ error: 'Provider not configured' }, { status: 503 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (error) {
    log.error('Could not read webhook body', error)
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  let result
  try {
    result = await gateway.verifyAndParseWebhook(rawBody, request.headers)
  } catch (error) {
    // Verification failure is permanent — answer 400 so the provider stops.
    log.warn('Webhook verification failed', {
      reason: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const { duplicate } = await paymentService.handleWebhook('mercadopago', result)
    log.info('Webhook processed', {
      eventId: result.eventId,
      status: result.status,
      reference: result.bookingReference,
      duplicate,
    })
    return NextResponse.json({ received: true, duplicate })
  } catch (error) {
    // Transient: 500 tells Mercado Pago to retry, and the event row records
    // the error for support.
    log.error('Webhook processing failed', error, { eventId: result.eventId })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
