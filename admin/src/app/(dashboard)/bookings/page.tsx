import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma, type Prisma } from '@vamos/db'
import { formatDate, formatDateTime, formatMoney } from '@vamos/shared'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Reservas' }
export const dynamic = 'force-dynamic'

const STATUSES = [
  'PENDING', 'AWAITING_PAYMENT', 'PAID', 'CONFIRMED',
  'COMPLETED', 'CANCELLED', 'REFUNDED',
] as const

type BookingRow = {
  id: string
  reference: string
  status: string
  totalCents: number
  currency: string
  createdAt: Date
  customerName: string
  customerEmail: string
  tourName: string
  travelDate: Date | null
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission('bookings:read')

  const params = await searchParams
  const str = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : undefined)

  const status = str('status')
  const query = str('q')
  const page = Math.max(1, Number(str('page')) || 1)
  const pageSize = 25

  const where: Prisma.BookingWhereInput = {
    ...(status && STATUSES.includes(status as (typeof STATUSES)[number])
      ? { status: status as (typeof STATUSES)[number] }
      : {}),
    ...(query
      ? {
          OR: [
            { reference: { contains: query, mode: 'insensitive' } },
            { customer: { email: { contains: query, mode: 'insensitive' } } },
            { customer: { lastName: { contains: query, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [bookings, total, counts] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, reference: true, status: true, totalCents: true,
        currency: true, createdAt: true,
        customer: { select: { firstName: true, lastName: true, email: true } },
        items: { select: { tourNameSnapshot: true, travelDate: true }, take: 1 },
      },
    }),
    prisma.booking.count({ where }),
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]))

  const rows: BookingRow[] = bookings.map((booking) => ({
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    totalCents: booking.totalCents,
    currency: booking.currency,
    createdAt: booking.createdAt,
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    customerEmail: booking.customer.email,
    tourName: booking.items[0]?.tourNameSnapshot ?? '—',
    travelDate: booking.items[0]?.travelDate ?? null,
  }))

  const columns: Column<BookingRow>[] = [
    { key: 'reference', header: 'Referencia', cell: (row) => row.reference },
    {
      key: 'customer',
      header: 'Cliente',
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.customerName}</p>
          <p className="text-[0.75rem] text-slate-500">{row.customerEmail}</p>
        </div>
      ),
    },
    { key: 'tour', header: 'Experiencia', cell: (row) => row.tourName },
    {
      key: 'travelDate',
      header: 'Fecha de salida',
      cell: (row) => (row.travelDate ? formatDate(row.travelDate) : '—'),
    },
    {
      key: 'total',
      header: 'Total',
      numeric: true,
      cell: (row) => formatMoney(row.totalCents, row.currency),
    },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'createdAt',
      header: 'Creada',
      cell: (row) => <span className="text-[0.75rem]">{formatDateTime(row.createdAt)}</span>,
    },
  ]

  return (
    <>
      <PageHeader title="Reservas" description={`${total} reservas coinciden con el filtro actual.`} />

      {/* Status filter as links, so a filtered view is shareable. */}
      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        <FilterLink href="/bookings" active={!status} label="Todas" />
        {STATUSES.map((value) => (
          <FilterLink
            key={value}
            href={`/bookings?status=${value}`}
            active={status === value}
            label={<StatusBadge status={value} />}
            count={countByStatus[value] ?? 0}
          />
        ))}
      </nav>

      <form method="get" action="/bookings" className="mb-4 flex gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label htmlFor="q" className="sr-only">
          Buscar por referencia, email o apellido
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Referencia, email o apellido…"
          className="admin-input max-w-sm"
        />
        <button
          type="submit"
          className="h-9.5 rounded-control border border-slate-300 bg-white px-4 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-50"
        >
          Buscar
        </button>
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowHref={(row) => `/bookings/${row.id}`}
        caption="Listado de reservas"
        emptyMessage="No hay reservas que coincidan con el filtro."
      />

      <Pagination
        basePath="/bookings"
        page={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        searchParams={{ status, q: query }}
      />
    </>
  )
}

function FilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: React.ReactNode
  count?: number
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1.5 text-[0.8125rem] transition-colors',
        active
          ? 'border-glacier-600 bg-glacier-50'
          : 'border-slate-300 bg-white hover:bg-slate-50',
      )}
    >
      {label}
      {count !== undefined ? (
        <span className="tabular text-[0.75rem] text-slate-500">{count}</span>
      ) : null}
    </Link>
  )
}
