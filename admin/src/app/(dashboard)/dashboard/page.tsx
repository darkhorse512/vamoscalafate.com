import Link from 'next/link'
import type { Metadata } from 'next'
import {
  AlertTriangle, ArrowRight, BedDouble, CalendarCheck, CircleDollarSign,
  FileText, Inbox, Mountain, Store, TrendingUp,
} from 'lucide-react'
import { prisma } from '@vamos/db'
import {
  formatDateTime, formatMoney, isEmailConfigured, isPaymentProviderConfigured,
  publicEnv, serverEnv,
} from '@vamos/shared'
import { Alert, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Panel' }
export const dynamic = 'force-dynamic'

/**
 * Dashboard.
 *
 * Every figure is a real aggregate over the database — nothing is estimated or
 * mocked. Revenue counts only APPROVED payments, so a pending or rejected
 * charge never inflates it.
 *
 * All counts run as one `Promise.all`; issued sequentially they would add a
 * round-trip each and make the most-visited screen the slowest.
 */
export default async function DashboardPage() {
  await requirePermission('dashboard:read')

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)

  const [
    totalBookings, pendingBookings, confirmedBookings,
    revenue, revenue30d,
    tours, hotels, businesses, pendingSubmissions, posts, pendingReviews,
    newContacts, recentBookings, upcomingDepartures,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ['PENDING', 'AWAITING_PAYMENT'] } } }),
    prisma.booking.count({ where: { status: { in: ['CONFIRMED', 'PAID'] } } }),

    // Only approved payments count as revenue.
    prisma.payment.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'APPROVED', paidAt: { gte: thirtyDaysAgo } },
      _sum: { amountCents: true },
    }),

    prisma.tour.count({ where: { status: 'PUBLISHED' } }),
    prisma.hotel.count({ where: { status: 'PUBLISHED' } }),
    prisma.business.count({ where: { status: 'PUBLISHED' } }),
    prisma.hotelSubmission.count({ where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
    prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.contactSubmission.count({ where: { status: 'NEW' } }),

    prisma.booking.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, reference: true, status: true, totalCents: true,
        currency: true, createdAt: true,
        customer: { select: { firstName: true, lastName: true } },
        items: { select: { tourNameSnapshot: true }, take: 1 },
      },
    }),

    // Operationally the most useful list: who is travelling next.
    prisma.bookingItem.findMany({
      where: {
        travelDate: { gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) },
        booking: { status: { in: ['CONFIRMED', 'PAID'] } },
      },
      take: 8,
      orderBy: { travelDate: 'asc' },
      select: {
        id: true, tourNameSnapshot: true, travelDate: true, departureTime: true,
        adults: true, children: true,
        booking: { select: { id: true, reference: true } },
      },
    }),
  ])

  const env = serverEnv()
  const integrationWarnings: string[] = []

  if (!isPaymentProviderConfigured('mercadopago') && !isPaymentProviderConfigured('stripe')) {
    integrationWarnings.push(
      'Ningún proveedor de pago está configurado. Las reservas se registran, pero no se puede cobrar online.',
    )
  }
  if (!isEmailConfigured()) {
    integrationWarnings.push(
      'El envío de correo no está configurado (EMAIL_TRANSPORT / RESEND_SMTP_PASSWORD). Las confirmaciones no se entregan.',
    )
  }
  if (!publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER) {
    integrationWarnings.push('No hay número de WhatsApp configurado; el botón de contacto no se muestra.')
  }

  return (
    <>
      <PageHeader
        title="Panel"
        description="Resumen operativo de reservas, catálogo y contenido."
      />

      {integrationWarnings.length > 0 ? (
        <Alert tone="warning" title="Configuración pendiente">
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {integrationWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {/* ── Key figures ───────────────────────────────────────────────── */}
      <section aria-label="Métricas principales" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CalendarCheck className="size-4" />}
          label="Reservas totales"
          value={String(totalBookings)}
          href="/bookings"
        />
        <StatCard
          icon={<AlertTriangle className="size-4" />}
          label="Pendientes de pago"
          value={String(pendingBookings)}
          href="/bookings?status=AWAITING_PAYMENT"
          tone={pendingBookings > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Confirmadas"
          value={String(confirmedBookings)}
          href="/bookings?status=CONFIRMED"
          tone="success"
        />
        <StatCard
          icon={<CircleDollarSign className="size-4" />}
          label="Ingresos acreditados"
          value={formatMoney(revenue._sum.amountCents ?? 0, env.DEFAULT_CURRENCY)}
          detail={`${formatMoney(revenue30d._sum.amountCents ?? 0, env.DEFAULT_CURRENCY)} en 30 días`}
          href="/payments"
        />
      </section>

      <section aria-label="Catálogo y contenido" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Mountain className="size-4" />} label="Excursiones" value={String(tours)} href="/tours" compact />
        <StatCard icon={<BedDouble className="size-4" />} label="Hoteles" value={String(hotels)} href="/hotels" compact />
        <StatCard icon={<Store className="size-4" />} label="Comercios" value={String(businesses)} href="/businesses" compact />
        <StatCard
          icon={<Inbox className="size-4" />}
          label="Solicitudes"
          value={String(pendingSubmissions)}
          href="/submissions"
          tone={pendingSubmissions > 0 ? 'warning' : 'neutral'}
          compact
        />
        <StatCard icon={<FileText className="size-4" />} label="Artículos" value={String(posts)} href="/blog" compact />
      </section>

      {/* ── Queues needing attention ──────────────────────────────────── */}
      {pendingReviews > 0 || newContacts > 0 || pendingSubmissions > 0 ? (
        <section className="mt-6" aria-label="Requiere atención">
          <h2 className="mb-3 text-[0.8125rem] font-semibold text-slate-900">Requiere atención</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {pendingSubmissions > 0 ? (
              <ActionItem href="/submissions" count={pendingSubmissions} label="solicitudes de alta sin revisar" />
            ) : null}
            {pendingReviews > 0 ? (
              <ActionItem href="/reviews?status=PENDING" count={pendingReviews} label="reseñas pendientes de moderar" />
            ) : null}
            {newContacts > 0 ? (
              <ActionItem href="/contacts" count={newContacts} label="consultas sin responder" />
            ) : null}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* ── Recent bookings ──────────────────────────────────────── */}
        <section className="admin-panel overflow-hidden" aria-labelledby="recent-bookings">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 id="recent-bookings" className="text-[0.8125rem] font-semibold text-slate-900">
              Últimas reservas
            </h2>
            <Link
              href="/bookings"
              className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-glacier-700 hover:text-glacier-900"
            >
              Ver todas
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <p className="px-4 py-10 text-center text-[0.8125rem] text-slate-500">
              Todavía no hay reservas registradas.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentBookings.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium text-slate-900">
                        {booking.reference} · {booking.customer.firstName} {booking.customer.lastName}
                      </p>
                      <p className="truncate text-[0.75rem] text-slate-500">
                        {booking.items[0]?.tourNameSnapshot ?? '—'} ·{' '}
                        {formatDateTime(booking.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-[0.8125rem] font-medium text-slate-900">
                        {formatMoney(booking.totalCents, booking.currency)}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Upcoming departures ──────────────────────────────────── */}
        <section className="admin-panel overflow-hidden" aria-labelledby="upcoming">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 id="upcoming" className="text-[0.8125rem] font-semibold text-slate-900">
              Próximas salidas confirmadas
            </h2>
          </div>

          {upcomingDepartures.length === 0 ? (
            <p className="px-4 py-10 text-center text-[0.8125rem] text-slate-500">
              No hay salidas confirmadas próximas.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingDepartures.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/bookings/${item.booking.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-medium text-slate-900">
                        {item.tourNameSnapshot}
                      </p>
                      <p className="text-[0.75rem] text-slate-500">
                        {item.booking.reference} · {item.adults + item.children} pasajeros
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="tabular text-[0.8125rem] font-medium text-slate-900">
                        {item.travelDate.toISOString().slice(0, 10).split('-').reverse().join('/')}
                      </p>
                      {item.departureTime ? (
                        <p className="text-[0.75rem] text-slate-500">{item.departureTime}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
  detail,
  href,
  tone = 'neutral',
  compact = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail?: string
  href: string
  tone?: 'neutral' | 'success' | 'warning'
  compact?: boolean
}) {
  const tones = {
    neutral: 'text-slate-500',
    success: 'text-status-success',
    warning: 'text-status-warning',
  }

  return (
    <Link
      href={href}
      className="admin-panel group block p-4 transition-colors hover:border-glacier-300"
    >
      <div className="flex items-center gap-2">
        <span className={cn('shrink-0', tones[tone])} aria-hidden="true">
          {icon}
        </span>
        <p className="text-[0.75rem] font-medium text-slate-500">{label}</p>
      </div>

      <p
        className={cn(
          'tabular mt-2 font-semibold text-slate-900',
          compact ? 'text-lg' : 'text-2xl',
        )}
      >
        {value}
      </p>

      {detail ? <p className="mt-0.5 text-[0.6875rem] text-slate-500">{detail}</p> : null}
    </Link>
  )
}

function ActionItem({ href, count, label }: { href: string; count: number; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-panel border border-[#eddfc0] bg-status-warningBg p-3.5 transition-colors hover:border-[#c9942a]"
      >
        <span className="tabular text-xl font-bold text-status-warning">{count}</span>
        <span className="text-[0.8125rem] leading-snug text-status-warning">{label}</span>
      </Link>
    </li>
  )
}
