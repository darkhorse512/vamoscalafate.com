import { NextResponse } from 'next/server'
import { logger } from '@vamos/shared'
import { getGatewayUnchecked } from '@/server/payments'
import { paymentService } from '@/server/services/payment'

const log = logger.scoped('webhook:stripe')

/**
 * Stripe webhook receiver.
 *
 * REQUIRED EXTERNAL CONFIGURATION
 *   Webhook URL: https://vamoscalafate.com/api/webhooks/stripe
 *   Events: checkout.session.completed, checkout.session.expired,
 *           charge.refunded, payment_intent.payment_failed
 *   Secret: STRIPE_WEBHOOK_SECRET
 *
 * See the Mercado Pago handler for the shared response contract.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const gateway = getGatewayUnchecked('stripe')

  if (!gateway?.isConfigured()) {
    log.warn('Webhook received but Stripe is not configured')
    return NextResponse.json({ error: 'Provider not configured' }, { status: 503 })
  }

  const rawBody = await request.text()

  let result
  try {
    result = await gateway.verifyAndParseWebhook(rawBody, request.headers)
  } catch (error) {
    log.warn('Webhook verification failed', {
      reason: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    const { duplicate } = await paymentService.handleWebhook('stripe', result)
    log.info('Webhook processed', {
      eventId: result.eventId,
      type: result.eventType,
      reference: result.bookingReference,
      duplicate,
    })
    return NextResponse.json({ received: true, duplicate })
  } catch (error) {
    log.error('Webhook processing failed', error, { eventId: result.eventId })
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
