import { AppError, serverEnv } from '@vamos/shared'
import type { PaymentGateway, ProviderKey } from '@vamos/types'
import { MercadoPagoGateway } from './mercadopago.ts'
import { StripeGateway } from './stripe.ts'

/**
 * PaymentService registry.
 *
 * Call sites ask for a gateway by key and get the `PaymentGateway` interface —
 * no component or server action ever imports a provider module directly. That
 * is what keeps provider logic out of the UI and makes a third provider a
 * matter of adding one file here.
 */

const gateways: Record<ProviderKey, PaymentGateway> = {
  mercadopago: new MercadoPagoGateway(),
  stripe: new StripeGateway(),
}

export function getGateway(key: ProviderKey): PaymentGateway {
  const gateway = gateways[key]
  if (!gateway) throw new AppError('PAYMENT_ERROR', `Unknown payment provider: ${key}`)

  if (!gateway.isConfigured()) {
    throw new AppError('PROVIDER_NOT_CONFIGURED', `${key} credentials are not configured`, {
      publicMessage: 'Ese medio de pago no está disponible en este momento.',
    })
  }

  return gateway
}

/**
 * Providers with complete credentials. Checkout renders only these, so a
 * half-configured provider is never offered and then fails mid-payment.
 */
export function availableProviders(): { key: ProviderKey; label: string; isDefault: boolean }[] {
  const defaultProvider = serverEnv().PAYMENT_DEFAULT_PROVIDER

  const labels: Record<ProviderKey, string> = {
    mercadopago: 'Mercado Pago',
    stripe: 'Tarjeta internacional (Stripe)',
  }

  return (Object.keys(gateways) as ProviderKey[])
    .filter((key) => gateways[key].isConfigured())
    .map((key) => ({ key, label: labels[key], isDefault: key === defaultProvider }))
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
}

/** Used by the webhook routes, which must not throw on a missing provider. */
export function getGatewayUnchecked(key: ProviderKey): PaymentGateway | null {
  return gateways[key] ?? null
}
