'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { formatMoney } from '@vamos/shared'
import type { ProviderKey } from '@vamos/types'
import { Button } from '@/components/ui/Button'
import { analytics } from '@/lib/analytics'
import { startCheckoutAction } from '@/server/actions/booking'
import { cn } from '@/lib/utils'

/**
 * Payment provider selection.
 *
 * The action redirects to the provider on success, so a successful call never
 * returns here. A returned value therefore always means failure - that is why
 * the result is only inspected for its error.
 */
export function PaymentSelector({
  bookingId,
  reference,
  providers,
  totalCents,
  currency,
}: {
  bookingId: string
  reference: string
  providers: { key: ProviderKey; label: string; isDefault: boolean }[]
  totalCents: number
  currency: string
}) {
  const [selected, setSelected] = useState<ProviderKey>(providers[0]?.key ?? 'mercadopago')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setSubmitting(true)
    setError(null)

    analytics.addPaymentInfo(selected, totalCents / 100, currency)

    const result = await startCheckoutAction({ bookingId, provider: selected })

    // Reaching here means the redirect did not happen.
    if (result && !result.ok) {
      setError(result.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-card border border-border p-5 sm:p-6">
      <fieldset>
        <legend className="font-display text-base font-semibold text-heading">
          Medio de pago
        </legend>

        <div className="mt-4 space-y-2.5">
          {providers.map((provider) => (
            <label
              key={provider.key}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-control border p-4 transition-colors',
                selected === provider.key
                  ? 'border-violet-700 bg-primary-soft'
                  : 'border-border-strong hover:border-primary hover:bg-surface-muted',
              )}
            >
              <input
                type="radio"
                name="provider"
                value={provider.key}
                checked={selected === provider.key}
                onChange={() => setSelected(provider.key)}
                className="size-4 border-border-strong text-primary focus:ring-2 focus:ring-primary"
              />
              <CreditCard className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="text-[0.9375rem] font-medium text-heading">{provider.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <Button fullWidth size="lg" className="mt-5" onClick={pay} disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Redirigiendo al pago…
          </>
        ) : (
          `Pagar ${formatMoney(totalCents, currency)}`
        )}
      </Button>

      <p className="mt-3 text-center text-[0.6875rem] text-muted-foreground">
        Reserva {reference} · Te redirigimos a la plataforma de pago seguro
      </p>
    </div>
  )
}
