import 'server-only'
import { prisma } from '@vamos/db'
import { AppError, centsToProviderAmount, logger, serverEnv } from '@vamos/shared'

const log = logger.scoped('admin:payments')

/**
 * Refund execution.
 *
 * The admin app talks to the provider APIs directly for refunds rather than
 * proxying through the public site — a refund is an operator action, and
 * routing it through a public endpoint would mean exposing one.
 *
 * Provider credentials live only in this process's environment.
 */
export async function refundPayment(input: {
  paymentId: string
  amountCents: number
  reason: string
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { booking: { select: { id: true, reference: true, status: true } } },
  })

  if (!payment) throw new AppError('NOT_FOUND', 'Pago no encontrado')

  if (payment.status !== 'APPROVED') {
    throw new AppError('CONFLICT', 'Solo se pueden reembolsar pagos aprobados', {
      publicMessage: 'Solo se pueden reembolsar pagos aprobados.',
    })
  }

  if (!payment.providerPaymentId) {
    throw new AppError('CONFLICT', 'El pago no tiene identificador del proveedor')
  }

  const refundable = payment.amountCents - payment.refundedCents
  if (input.amountCents > refundable) {
    throw new AppError('VALIDATION_ERROR', 'Importe superior al reembolsable', {
      publicMessage: `El máximo reembolsable es ${(refundable / 100).toFixed(2)}.`,
    })
  }

  const env = serverEnv()
  let refundedCents = 0

  if (payment.provider === 'MERCADOPAGO') {
    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new AppError('PROVIDER_NOT_CONFIGURED', 'MERCADOPAGO_ACCESS_TOKEN no está configurado')
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment.providerPaymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `refund-${payment.id}-${input.amountCents}`,
        },
        body: JSON.stringify({ amount: centsToProviderAmount(input.amountCents) }),
      },
    )

    if (!response.ok) {
      const detail = await response.text()
      log.error('Mercado Pago refund failed', undefined, { status: response.status, detail })
      throw new AppError('PAYMENT_ERROR', 'Mercado Pago rechazó el reembolso')
    }

    const refund = (await response.json()) as { amount: number }
    refundedCents = Math.round(refund.amount * 100)
  } else if (payment.provider === 'STRIPE') {
    if (!env.STRIPE_SECRET_KEY) {
      throw new AppError('PROVIDER_NOT_CONFIGURED', 'STRIPE_SECRET_KEY no está configurado')
    }

    const body = new URLSearchParams({
      payment_intent: payment.providerPaymentId,
      amount: String(input.amountCents),
    })

    const response = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `refund-${payment.id}-${input.amountCents}`,
      },
      body,
    })

    if (!response.ok) {
      const detail = await response.text()
      log.error('Stripe refund failed', undefined, { status: response.status, detail })
      throw new AppError('PAYMENT_ERROR', 'Stripe rechazó el reembolso')
    }

    const refund = (await response.json()) as { amount: number }
    refundedCents = refund.amount
  } else {
    // MANUAL payments are reconciled outside the system; record the intent.
    refundedCents = input.amountCents
  }

  const totalRefunded = payment.refundedCents + refundedCents
  const fullyRefunded = totalRefunded >= payment.amountCents

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        refundedCents: totalRefunded,
        status: fullyRefunded ? 'REFUNDED' : payment.status,
        refundedAt: new Date(),
      },
    })

    if (fullyRefunded && payment.booking.status !== 'REFUNDED') {
      await tx.booking.update({
        where: { id: payment.booking.id },
        data: { status: 'REFUNDED' },
      })
    }
  })

  log.info('Refund processed', {
    paymentId: payment.id,
    reference: payment.booking.reference,
    refundedCents,
  })

  return { refundedCents, status: fullyRefunded ? ('REFUNDED' as const) : payment.status }
}
