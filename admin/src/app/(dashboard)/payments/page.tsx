import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma, type Prisma } from '@vamos/db'
import { formatDateTime, formatMoney } from '@vamos/shared'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Pagos' }
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  bookingId: string
  reference: string
  provider: string
  status: string
  amountCents: number
  refundedCents: number
  currency: string
  createdAt: Date
  providerPaymentId: string | null
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission('payments:read')

  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : undefined
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = 25

  const where: Prisma.PaymentWhereInput = status
    ? { status: status as Prisma.PaymentWhereInput['status'] }
    : {}

  const [payments, total, approved, refunded] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, provider: true, status: true, amountCents: true,
        refundedCents: true, currency: true, createdAt: true, providerPaymentId: true,
        booking: { select: { id: true, reference: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { status: 'APPROVED' }, _sum: { amountCents: true } }),
    prisma.payment.aggregate({ _sum: { refundedCents: true } }),
  ])

  const rows: Row[] = payments.map((payment) => ({
    id: payment.id,
    bookingId: payment.booking.id,
    reference: payment.booking.reference,
    provider: payment.provider,
    status: payment.status,
    amountCents: payment.amountCents,
    refundedCents: payment.refundedCents,
    currency: payment.currency,
    createdAt: payment.createdAt,
    providerPaymentId: payment.providerPaymentId,
  }))

  const columns: Column<Row>[] = [
    {
      key: 'reference',
      header: 'Reserva',
      cell: (row) => (
        <Link href={`/bookings/${row.bookingId}`} className="text-glacier-700 hover:underline">
          {row.reference}
        </Link>
      ),
    },
    { key: 'provider', header: 'Proveedor', cell: (row) => row.provider },
    {
      key: 'providerId',
      header: 'ID del proveedor',
      cell: (row) => (
        <span className="font-mono text-[0.75rem] text-slate-500">
          {row.providerPaymentId ?? '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Importe',
      numeric: true,
      cell: (row) => formatMoney(row.amountCents, row.currency),
    },
    {
      key: 'refunded',
      header: 'Reembolsado',
      numeric: true,
      cell: (row) =>
        row.refundedCents > 0 ? formatMoney(row.refundedCents, row.currency) : '—',
    },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'createdAt',
      header: 'Fecha',
      cell: (row) => <span className="text-[0.75rem]">{formatDateTime(row.createdAt)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Pagos"
        description="Los pagos se crean y confirman desde los webhooks del proveedor, nunca desde el navegador del cliente."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="admin-panel p-4">
          <p className="text-[0.75rem] font-medium text-slate-500">Acreditado</p>
          <p className="tabular mt-1 text-xl font-semibold text-slate-900">
            {formatMoney(approved._sum.amountCents ?? 0, 'ARS')}
          </p>
        </div>
        <div className="admin-panel p-4">
          <p className="text-[0.75rem] font-medium text-slate-500">Reembolsado</p>
          <p className="tabular mt-1 text-xl font-semibold text-slate-900">
            {formatMoney(refunded._sum.refundedCents ?? 0, 'ARS')}
          </p>
        </div>
        <div className="admin-panel p-4">
          <p className="text-[0.75rem] font-medium text-slate-500">Operaciones</p>
          <p className="tabular mt-1 text-xl font-semibold text-slate-900">{total}</p>
        </div>
      </div>

      {rows.length === 0 && !status ? (
        <EmptyState
          title="No hay pagos registrados"
          description="Los pagos aparecen cuando un cliente inicia el checkout y el proveedor notifica el resultado."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            caption="Listado de pagos"
            emptyMessage="No hay pagos con ese estado."
          />
          <Pagination
            basePath="/payments"
            page={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            searchParams={{ status }}
          />
        </>
      )}
    </>
  )
}
