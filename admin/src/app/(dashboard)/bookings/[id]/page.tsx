import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@vamos/db'
import { formatDate, formatDateTime, formatMoney } from '@vamos/shared'
import { can } from '@vamos/shared'
import { BookingActions } from '@/components/BookingActions'
import { PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Detalle de reserva' }
export const dynamic = 'force-dynamic'

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requirePermission('bookings:read')
  const { id } = await params

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          tour: { select: { slug: true, name: true } },
          option: { select: { name: true, freeCancellationHours: true } },
          pickupLocation: { select: { name: true, address: true } },
        },
      },
      passengers: true,
      payments: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!booking) notFound()

  const canUpdate = can(session.role, 'bookings:update')
  const canRefund = can(session.role, 'payments:refund')
  const approvedPayment = booking.payments.find((p) => p.status === 'APPROVED')

  return (
    <>
      <Link
        href="/bookings"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-heading"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Volver a reservas
      </Link>

      <PageHeader
        title={`Reserva ${booking.reference}`}
        description={`Creada el ${formatDateTime(booking.createdAt)}`}
        action={<StatusBadge status={booking.status} className="text-[0.75rem]" />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          {/* Items */}
          <section className="admin-panel overflow-hidden">
            <h2 className="border-b border-border px-4 py-3 text-[0.8125rem] font-semibold text-heading">
              Experiencias reservadas
            </h2>

            <ul className="divide-y divide-border">
              {booking.items.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.875rem] font-semibold text-heading">
                        {item.tourNameSnapshot}
                      </p>
                      <p className="text-[0.8125rem] text-subtle-foreground">{item.optionNameSnapshot}</p>
                    </div>
                    <p className="tabular shrink-0 text-[0.875rem] font-semibold text-heading">
                      {formatMoney(item.subtotalCents, booking.currency)}
                    </p>
                  </div>

                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-[0.8125rem] sm:grid-cols-2">
                    <Row label="Fecha de salida" value={formatDate(item.travelDate)} />
                    {item.departureTime ? <Row label="Horario" value={item.departureTime} /> : null}
                    <Row
                      label="Pasajeros"
                      value={`${item.adults} adultos${item.children ? ` · ${item.children} menores` : ''}`}
                    />
                    <Row
                      label="Precio unitario"
                      value={formatMoney(item.unitPriceCents, booking.currency)}
                    />
                    {item.pickupLocation ? (
                      <Row label="Punto de encuentro" value={item.pickupLocation.name} />
                    ) : null}
                    {item.pickupCostCents > 0 ? (
                      <Row
                        label="Costo de encuentro"
                        value={formatMoney(item.pickupCostCents, booking.currency)}
                      />
                    ) : null}
                  </dl>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-t border-border bg-surface-muted px-4 py-3">
              <span className="text-[0.875rem] font-semibold text-heading">Total</span>
              <span className="tabular text-[0.875rem] font-semibold text-heading">
                {formatMoney(booking.totalCents, booking.currency)}
              </span>
            </div>
          </section>

          {/* Payments */}
          <section className="admin-panel overflow-hidden">
            <h2 className="border-b border-border px-4 py-3 text-[0.8125rem] font-semibold text-heading">
              Pagos
            </h2>

            {booking.payments.length === 0 ? (
              <p className="px-4 py-8 text-center text-[0.8125rem] text-subtle-foreground">
                No hay pagos registrados para esta reserva.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {booking.payments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-[0.8125rem] font-medium text-heading">
                        {payment.provider}
                      </p>
                      <p className="text-[0.75rem] text-subtle-foreground">
                        {payment.providerPaymentId ?? 'Sin ID del proveedor'} ·{' '}
                        {formatDateTime(payment.createdAt)}
                      </p>
                      {payment.failureReason ? (
                        <p className="mt-1 text-[0.75rem] text-status-danger">
                          {payment.failureReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-[0.8125rem] font-medium text-heading">
                        {formatMoney(payment.amountCents, payment.currency)}
                      </span>
                      {payment.refundedCents > 0 ? (
                        <span className="tabular text-[0.75rem] text-subtle-foreground">
                          −{formatMoney(payment.refundedCents, payment.currency)}
                        </span>
                      ) : null}
                      <StatusBadge status={payment.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {booking.specialRequests ? (
            <section className="admin-panel p-4">
              <h2 className="text-[0.8125rem] font-semibold text-heading">
                Comentarios del cliente
              </h2>
              <p className="mt-2 whitespace-pre-line text-[0.8125rem] leading-relaxed text-foreground">
                {booking.specialRequests}
              </p>
            </section>
          ) : null}

          {/* Attribution - how this booking was acquired. */}
          {booking.utmSource || booking.utmCampaign || booking.referrer ? (
            <section className="admin-panel p-4">
              <h2 className="text-[0.8125rem] font-semibold text-heading">Atribución</h2>
              <dl className="mt-2 grid gap-x-6 gap-y-2 text-[0.8125rem] sm:grid-cols-2">
                {booking.utmSource ? <Row label="Fuente" value={booking.utmSource} /> : null}
                {booking.utmMedium ? <Row label="Medio" value={booking.utmMedium} /> : null}
                {booking.utmCampaign ? <Row label="Campaña" value={booking.utmCampaign} /> : null}
                {booking.utmTerm ? <Row label="Término" value={booking.utmTerm} /> : null}
                {booking.referrer ? <Row label="Referente" value={booking.referrer} /> : null}
              </dl>
            </section>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="admin-panel p-4">
            <h2 className="text-[0.8125rem] font-semibold text-heading">Cliente</h2>
            <dl className="mt-3 space-y-2 text-[0.8125rem]">
              <Row
                label="Nombre"
                value={`${booking.customer.firstName} ${booking.customer.lastName}`}
              />
              <Row label="Email" value={booking.customer.email} />
              {booking.customer.phone ? <Row label="Teléfono" value={booking.customer.phone} /> : null}
              {booking.customer.country ? <Row label="País" value={booking.customer.country} /> : null}
              {booking.customer.hotelName ? (
                <Row label="Alojamiento" value={booking.customer.hotelName} />
              ) : null}
            </dl>

            <Link
              href={`/customers/${booking.customerId}`}
              className="mt-3 inline-block text-[0.75rem] font-medium text-violet-700 hover:underline"
            >
              Ver ficha del cliente
            </Link>
          </section>

          {canUpdate ? (
            <BookingActions
              bookingId={booking.id}
              currentStatus={booking.status}
              internalNotes={booking.internalNotes ?? ''}
              canRefund={canRefund && Boolean(approvedPayment)}
              payment={
                approvedPayment
                  ? {
                      id: approvedPayment.id,
                      refundableCents:
                        approvedPayment.amountCents - approvedPayment.refundedCents,
                      currency: approvedPayment.currency,
                    }
                  : null
              }
            />
          ) : null}
        </aside>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-subtle-foreground">{label}</dt>
      <dd className="break-words text-right font-medium text-heading">{value}</dd>
    </div>
  )
}
