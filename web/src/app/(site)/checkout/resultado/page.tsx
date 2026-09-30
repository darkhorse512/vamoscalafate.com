import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { ROUTES, formatDate, formatMoney } from '@vamos/shared'
import { PurchaseTracker } from '@/components/booking/PurchaseTracker'
import { noindexMetadata } from '@/lib/seo'
import { bookingService } from '@/server/services/booking'

/**
 * Post-payment return page.
 *
 * IMPORTANT: the `estado` query parameter is the provider's redirect hint and
 * is treated as presentation only. The booking status rendered here is read
 * from the database, where it was set by a signature-verified webhook.
 *
 * A visitor who edits the URL to `?estado=exito` sees whatever the database
 * actually says — never a confirmation that did not happen.
 */
export const metadata: Metadata = noindexMetadata(
  'Resultado del pago',
  'Estado de tu reserva tras el pago.',
)

export const dynamic = 'force-dynamic'

export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const reference = typeof params.ref === 'string' ? params.ref : undefined

  if (!reference) notFound()

  const booking = await bookingService.getByReference(reference)
  if (!booking) notFound()

  const item = booking.items[0]

  // Derived from the database, not from the redirect.
  const isPaid = ['PAID', 'CONFIRMED', 'COMPLETED'].includes(booking.status)
  const isFailed = ['CANCELLED'].includes(booking.status)
  const isPending = !isPaid && !isFailed

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-xl text-center">
        {isPaid ? (
          <>
            <CheckCircle2 className="mx-auto size-14 text-[#2f6f4f]" aria-hidden="true" />
            <h1 className="mt-5 font-display text-display-sm font-bold leading-tight text-lenga-950">
              Reserva confirmada
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-lenga-600">
              Te enviamos la confirmación a{' '}
              <strong className="font-semibold text-lenga-900">{booking.customer.email}</strong>.
              Guardá la referencia: te identifica en cualquier consulta.
            </p>

            {/* Fires the GA4 purchase event exactly once, keyed by reference. */}
            <PurchaseTracker
              reference={booking.reference}
              valueMajorUnits={booking.totalCents / 100}
              currency={booking.currency}
              items={
                item
                  ? [
                      {
                        item_id: item.tour.slug,
                        item_name: item.tourNameSnapshot,
                        price: booking.totalCents / 100,
                        quantity: item.adults + item.children,
                      },
                    ]
                  : []
              }
            />
          </>
        ) : isFailed ? (
          <>
            <XCircle className="mx-auto size-14 text-[#9b3232]" aria-hidden="true" />
            <h1 className="mt-5 font-display text-display-sm font-bold leading-tight text-lenga-950">
              El pago no se completó
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-lenga-600">
              La reserva {booking.reference} fue cancelada y los lugares se liberaron. Podés volver
              a intentarlo con otro medio de pago.
            </p>
          </>
        ) : (
          <>
            <Clock className="mx-auto size-14 text-[#8a6014]" aria-hidden="true" />
            <h1 className="mt-5 font-display text-display-sm font-bold leading-tight text-lenga-950">
              Estamos verificando tu pago
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-lenga-600">
              Algunos medios de pago tardan unos minutos en acreditarse. Apenas se confirme, te
              enviamos un correo a{' '}
              <strong className="font-semibold text-lenga-900">{booking.customer.email}</strong>.
            </p>
            <p className="mt-2 text-sm text-lenga-500">
              No hace falta que vuelvas a pagar. Si el pago no se acredita, la reserva se cancela
              automáticamente y los lugares se liberan.
            </p>
          </>
        )}

        <div className="mt-8 rounded-card border border-stone-200 bg-stone-50 p-5 text-left">
          <dl className="space-y-2.5 text-[0.8125rem]">
            <Row label="Referencia" value={booking.reference} />
            <Row label="Estado" value={booking.status} />
            {item ? <Row label="Experiencia" value={item.tourNameSnapshot} /> : null}
            {item ? <Row label="Fecha" value={formatDate(item.travelDate)} /> : null}
            <Row label="Total" value={formatMoney(booking.totalCents, booking.currency)} />
          </dl>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {isFailed || isPending ? (
            <Link
              href={`${ROUTES.checkout}?ref=${encodeURIComponent(booking.reference)}`}
              className="inline-flex h-11 items-center justify-center rounded-control bg-glacier-700 px-5 text-sm font-semibold text-white hover:bg-glacier-800"
            >
              Volver al pago
            </Link>
          ) : null}

          <Link
            href={ROUTES.tours}
            className="inline-flex h-11 items-center justify-center rounded-control border border-stone-300 px-5 text-sm font-semibold text-lenga-900 hover:bg-stone-50"
          >
            Ver más experiencias
          </Link>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-lenga-500">{label}</dt>
      <dd className="text-right font-medium text-lenga-900">{value}</dd>
    </div>
  )
}
