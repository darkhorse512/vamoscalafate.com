import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { AlertCircle, Lock } from 'lucide-react'
import { ROUTES, formatDate, formatMoney } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PaymentSelector } from '@/components/booking/PaymentSelector'
import { noindexMetadata } from '@/lib/seo'
import { availableProviders } from '@/server/payments'
import { bookingService } from '@/server/services/booking'

/**
 * Payment step.
 *
 * Never indexed. Only providers with complete credentials are offered, so a
 * visitor is never sent to a payment flow that cannot complete.
 */
export const metadata: Metadata = noindexMetadata(
  'Pago de tu reserva',
  'Elegí el medio de pago para completar tu reserva.',
)

export const dynamic = 'force-dynamic'

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const reference = typeof params.ref === 'string' ? params.ref : undefined

  if (!reference) notFound()

  const booking = await bookingService.getByReference(reference)
  if (!booking) notFound()

  // A booking that is already settled must not be payable again.
  const settled = ['PAID', 'CONFIRMED', 'COMPLETED', 'REFUNDED', 'CANCELLED'].includes(
    booking.status,
  )

  const providers = availableProviders()
  const item = booking.items[0]

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: 'Inicio', path: '/' },
          { name: 'Reservar', path: ROUTES.book },
          { name: 'Pago', path: ROUTES.checkout },
        ]}
      />

      <h1 className="mt-5 font-display text-display-sm font-bold leading-tight text-heading">
        {settled ? 'Estado de tu reserva' : 'Elegí cómo pagar'}
      </h1>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10">
        <div className="min-w-0">
          {settled ? (
            <div className="rounded-card border border-border bg-surface-muted p-6">
              <h2 className="font-display text-lg font-semibold text-heading">
                Esta reserva ya no requiere pago
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                El estado actual de la reserva {booking.reference} es{' '}
                <strong className="font-semibold text-heading">{booking.status}</strong>. Si creés
                que se trata de un error, respondé al correo de confirmación indicando la
                referencia.
              </p>
              <Link
                href={ROUTES.tours}
                className="mt-5 inline-block text-sm font-semibold text-violet-700 underline underline-offset-2"
              >
                Ver otras excursiones
              </Link>
            </div>
          ) : providers.length === 0 ? (
            /* No configured provider. Say so plainly rather than showing a
               payment button that cannot work. */
            <div className="flex gap-3 rounded-card border-l-[3px] border-[#c9942a] bg-[#fdf9f0] p-5">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#8a6014]" aria-hidden="true" />
              <div>
                <h2 className="font-sans text-[0.9375rem] font-bold text-[#8a6014]">
                  El pago online no está disponible en este momento
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#8a6014]">
                  Tu reserva <strong>{booking.reference}</strong> quedó registrada y los lugares
                  están tomados. Nos comunicamos con vos por correo para coordinar el pago.
                </p>
                <p className="mt-3 text-sm">
                  <Link href={ROUTES.contact} className="font-semibold underline underline-offset-2">
                    Contactanos
                  </Link>{' '}
                  si preferís resolverlo ahora.
                </p>
              </div>
            </div>
          ) : (
            <PaymentSelector
              bookingId={booking.id}
              reference={booking.reference}
              providers={providers}
              totalCents={booking.totalCents}
              currency={booking.currency}
            />
          )}

          <div className="mt-6 flex items-start gap-2.5 text-xs leading-relaxed text-plum-500">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>
              El pago se procesa íntegramente en la plataforma del proveedor. Vamos Calafate no
              recibe ni almacena los datos de tu tarjeta.
            </p>
          </div>
        </div>

        <aside className="mt-8 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
          <div className="rounded-card border border-border bg-surface-muted p-5">
            <h2 className="font-display text-base font-semibold text-heading">Resumen</h2>

            <dl className="mt-4 space-y-2.5 border-b border-border pb-4 text-[0.8125rem]">
              <Row label="Referencia" value={booking.reference} />
              {item ? <Row label="Experiencia" value={item.tourNameSnapshot} /> : null}
              {item ? <Row label="Opción" value={item.optionNameSnapshot} /> : null}
              {item ? <Row label="Fecha" value={formatDate(item.travelDate)} /> : null}
              {item?.departureTime ? <Row label="Horario" value={item.departureTime} /> : null}
              {item ? (
                <Row
                  label="Pasajeros"
                  value={`${item.adults} adultos${item.children ? ` · ${item.children} menores` : ''}`}
                />
              ) : null}
            </dl>

            <div className="mt-4 flex justify-between font-display text-base font-bold text-heading">
              <span>Total</span>
              <span>{formatMoney(booking.totalCents, booking.currency)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-plum-500">{label}</dt>
      <dd className="text-right font-medium text-heading">{value}</dd>
    </div>
  )
}
