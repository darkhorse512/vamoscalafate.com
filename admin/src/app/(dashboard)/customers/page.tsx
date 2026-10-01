import type { Metadata } from 'next'
import { prisma, type Prisma } from '@vamos/db'
import { formatDate, formatMoney } from '@vamos/shared'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { EmptyState, PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Clientes' }
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  email: string
  phone: string
  country: string
  bookings: number
  spentCents: number
  createdAt: Date
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission('customers:read')

  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q : undefined
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = 25

  const where: Prisma.CustomerWhereInput = query
    ? {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {}

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, firstName: true, lastName: true, email: true,
        phone: true, country: true, createdAt: true,
        bookings: {
          // Lifetime value counts only settled bookings - a cancelled one
          // never represented revenue.
          where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
          select: { totalCents: true },
        },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.customer.count({ where }),
  ])

  const rows: Row[] = customers.map((customer) => ({
    id: customer.id,
    name: `${customer.firstName} ${customer.lastName}`,
    email: customer.email,
    phone: customer.phone ?? '-',
    country: customer.country ?? '-',
    bookings: customer._count.bookings,
    spentCents: customer.bookings.reduce((sum, b) => sum + b.totalCents, 0),
    createdAt: customer.createdAt,
  }))

  const columns: Column<Row>[] = [
    { key: 'name', header: 'Cliente', cell: (row) => row.name },
    { key: 'email', header: 'Email', cell: (row) => row.email },
    { key: 'phone', header: 'Teléfono', cell: (row) => row.phone },
    { key: 'country', header: 'País', cell: (row) => row.country },
    { key: 'bookings', header: 'Reservas', numeric: true, cell: (row) => String(row.bookings) },
    {
      key: 'spent',
      header: 'Facturado',
      numeric: true,
      cell: (row) => formatMoney(row.spentCents, 'ARS'),
    },
    { key: 'createdAt', header: 'Alta', cell: (row) => formatDate(row.createdAt) },
  ]

  return (
    <>
      <PageHeader title="Clientes" description={`${total} clientes registrados.`} />

      <form method="get" action="/customers" className="mb-4 flex gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar clientes
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Nombre, apellido o email…"
          className="admin-input max-w-sm"
        />
        <button
          type="submit"
          className="h-9.5 rounded-control border border-border-strong bg-surface px-4 text-[0.8125rem] font-medium text-foreground hover:bg-surface-muted"
        >
          Buscar
        </button>
      </form>

      {rows.length === 0 && !query ? (
        <EmptyState
          title="Todavía no hay clientes"
          description="Los clientes se crean automáticamente con la primera reserva."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            caption="Listado de clientes"
            emptyMessage="No hay clientes que coincidan con la búsqueda."
          />
          <Pagination
            basePath="/customers"
            page={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            searchParams={{ q: query }}
          />
        </>
      )}
    </>
  )
}
