import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Webhook signature verification.
 *
 * This is the boundary that decides whether a booking gets marked paid, so it
 * is the single most security-critical code path in the platform. A forged
 * notification that verified would let anyone confirm a booking for free.
 *
 * The gateways are imported dynamically so the environment can be set first.
 */

const MP_SECRET = 'mp_test_webhook_secret'
const STRIPE_SECRET = 'whsec_test_secret'

beforeEach(() => {
  vi.resetModules()
  process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token'
  process.env.MERCADOPAGO_WEBHOOK_SECRET = MP_SECRET
  process.env.STRIPE_SECRET_KEY = 'sk_test_key'
  process.env.STRIPE_WEBHOOK_SECRET = STRIPE_SECRET
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://x:y@localhost:5432/z'
})

describe('Stripe webhook verification', () => {
  const body = JSON.stringify({
    id: 'evt_123',
    type: 'checkout.session.completed',
    data: { object: { client_reference_id: 'VC-ABC123', amount_total: 14_500_000, currency: 'ars' } },
  })

  function sign(payload: string, timestamp: number, secret = STRIPE_SECRET) {
    return createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
  }

  it('accepts a correctly signed payload', async () => {
    const { StripeGateway } = await import('../../web/src/server/payments/stripe')
    const gateway = new StripeGateway()

    const timestamp = Math.floor(Date.now() / 1000)
    const headers = new Headers({
      'stripe-signature': `t=${timestamp},v1=${sign(body, timestamp)}`,
    })

    const result = await gateway.verifyAndParseWebhook(body, headers)

    expect(result.eventId).toBe('evt_123')
    expect(result.status).toBe('APPROVED')
    expect(result.bookingReference).toBe('VC-ABC123')
    expect(result.amountCents).toBe(14_500_000)
  })

  it('rejects a payload signed with the wrong secret', async () => {
    const { StripeGateway } = await import('../../web/src/server/payments/stripe')
    const gateway = new StripeGateway()

    const timestamp = Math.floor(Date.now() / 1000)
    const headers = new Headers({
      'stripe-signature': `t=${timestamp},v1=${sign(body, timestamp, 'attacker_secret')}`,
    })

    await expect(gateway.verifyAndParseWebhook(body, headers)).rejects.toThrow()
  })

  it('rejects a tampered body under a valid old signature', async () => {
    const { StripeGateway } = await import('../../web/src/server/payments/stripe')
    const gateway = new StripeGateway()

    const timestamp = Math.floor(Date.now() / 1000)
    const signature = sign(body, timestamp)

    // Attacker raises the amount but reuses the signature for the original body.
    const tampered = body.replace('14500000', '1')
    const headers = new Headers({ 'stripe-signature': `t=${timestamp},v1=${signature}` })

    await expect(gateway.verifyAndParseWebhook(tampered, headers)).rejects.toThrow()
  })

  it('rejects a replayed signature outside the tolerance window', async () => {
    const { StripeGateway } = await import('../../web/src/server/payments/stripe')
    const gateway = new StripeGateway()

    // 10 minutes old - beyond Stripe's recommended 5-minute tolerance.
    const timestamp = Math.floor(Date.now() / 1000) - 600
    const headers = new Headers({ 'stripe-signature': `t=${timestamp},v1=${sign(body, timestamp)}` })

    await expect(gateway.verifyAndParseWebhook(body, headers)).rejects.toThrow()
  })

  it('rejects a missing signature header', async () => {
    const { StripeGateway } = await import('../../web/src/server/payments/stripe')
    const gateway = new StripeGateway()

    await expect(gateway.verifyAndParseWebhook(body, new Headers())).rejects.toThrow()
  })

  it('maps an expired checkout session to CANCELLED', async () => {
    const { StripeGateway } = await import('../../web/src/server/payments/stripe')
    const gateway = new StripeGateway()

    const expiredBody = JSON.stringify({
      id: 'evt_expired',
      type: 'checkout.session.expired',
      data: { object: { client_reference_id: 'VC-ABC123' } },
    })

    const timestamp = Math.floor(Date.now() / 1000)
    const headers = new Headers({
      'stripe-signature': `t=${timestamp},v1=${sign(expiredBody, timestamp)}`,
    })

    const result = await gateway.verifyAndParseWebhook(expiredBody, headers)
    expect(result.status).toBe('CANCELLED')
  })
})

describe('Mercado Pago webhook verification', () => {
  const dataId = '1234567890'
  const requestId = 'req-abc'

  const body = JSON.stringify({ type: 'payment', data: { id: dataId } })

  function signManifest(timestamp: string, secret = MP_SECRET, id = dataId) {
    // Mercado Pago signs a fixed manifest template, not the raw body.
    const manifest = `id:${id};request-id:${requestId};ts:${timestamp};`
    return createHmac('sha256', secret).update(manifest).digest('hex')
  }

  it('rejects a payload signed with the wrong secret', async () => {
    const { MercadoPagoGateway } = await import('../../web/src/server/payments/mercadopago')
    const gateway = new MercadoPagoGateway()

    const timestamp = String(Math.floor(Date.now() / 1000))
    const headers = new Headers({
      'x-signature': `ts=${timestamp},v1=${signManifest(timestamp, 'wrong_secret')}`,
      'x-request-id': requestId,
    })

    await expect(gateway.verifyAndParseWebhook(body, headers)).rejects.toThrow()
  })

  it('rejects a stale timestamp', async () => {
    const { MercadoPagoGateway } = await import('../../web/src/server/payments/mercadopago')
    const gateway = new MercadoPagoGateway()

    const timestamp = String(Math.floor(Date.now() / 1000) - 3600)
    const headers = new Headers({
      'x-signature': `ts=${timestamp},v1=${signManifest(timestamp)}`,
      'x-request-id': requestId,
    })

    await expect(gateway.verifyAndParseWebhook(body, headers)).rejects.toThrow()
  })

  it('rejects a malformed signature header', async () => {
    const { MercadoPagoGateway } = await import('../../web/src/server/payments/mercadopago')
    const gateway = new MercadoPagoGateway()

    const headers = new Headers({ 'x-signature': 'garbage', 'x-request-id': requestId })
    await expect(gateway.verifyAndParseWebhook(body, headers)).rejects.toThrow()
  })

  it('rejects a signature computed over a different resource id', async () => {
    const { MercadoPagoGateway } = await import('../../web/src/server/payments/mercadopago')
    const gateway = new MercadoPagoGateway()

    const timestamp = String(Math.floor(Date.now() / 1000))
    // Signature is valid, but for a different payment than the body claims.
    const headers = new Headers({
      'x-signature': `ts=${timestamp},v1=${signManifest(timestamp, MP_SECRET, '999')}`,
      'x-request-id': requestId,
    })

    await expect(gateway.verifyAndParseWebhook(body, headers)).rejects.toThrow()
  })
})

describe('gateway configuration', () => {
  it('reports itself unconfigured when credentials are missing', async () => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    vi.resetModules()

    const { StripeGateway } = await import('../../web/src/server/payments/stripe')
    expect(new StripeGateway().isConfigured()).toBe(false)
  })
})
