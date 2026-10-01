import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma, type Prisma } from '@vamos/db'
import { formatDateTime } from '@vamos/shared'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Solicitudes de alta' }
export const dynamic = 'force-dynamic'

const STATUSES = ['PENDING', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'APPROVED', 'REJECTED'] as const

type Row = {
  id: string
  reference: string
  businessName: string
  kind: string
  contactName: string
  email: string
  status: string
  createdAt: Date
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission('submissions:read')

  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : undefined
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = 25

  const where: Prisma.HotelSubmissionWhereInput = status
    ? { status: status as (typeof STATUSES)[number] }
    : {}

  const [submissions, total, counts] = await Promise.all([
    prisma.hotelSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, reference: true, businessName: true, kind: true,
        contactName: true, email: true, status: true, createdAt: true,
      },
    }),
    prisma.hotelSubmission.count({ where }),
    prisma.hotelSubmission.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]))

  const columns: Column<Row>[] = [
    { key: 'reference', header: 'Referencia', cell: (row) => row.reference },
    { key: 'name', header: 'Establecimiento', cell: (row) => row.businessName },
    {
      key: 'kind',
      header: 'Tipo',
      cell: (row) => (row.kind === 'HOTEL' ? 'Alojamiento' : 'Comercio'),
    },
    {
      key: 'contact',
      header: 'Contacto',
      cell: (row) => (
        <div>
          <p className="text-heading">{row.contactName}</p>
          <p className="text-[0.75rem] text-subtle-foreground">{row.email}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'createdAt',
      header: 'Recibida',
      cell: (row) => <span className="text-[0.75rem]">{formatDateTime(row.createdAt)}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Solicitudes de alta"
        description="Hoteles y comercios que pidieron publicarse en la guía. Ninguna se publica sin aprobación."
      />

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        <FilterLink href="/submissions" active={!status} label="Todas" />
        {STATUSES.map((value) => (
          <FilterLink
            key={value}
            href={`/submissions?status=${value}`}
            active={status === value}
            label={<StatusBadge status={value} />}
            count={countByStatus[value] ?? 0}
          />
        ))}
      </nav>

      {submissions.length === 0 && !status ? (
        <EmptyState
          title="No hay solicitudes"
          description="Cuando un hotel o comercio complete el formulario público, aparecerá acá para su revisión."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={submissions}
            rowHref={(row) => `/submissions/${row.id}`}
            caption="Solicitudes de alta"
            emptyMessage="No hay solicitudes con ese estado."
          />
          <Pagination
            basePath="/submissions"
            page={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            searchParams={{ status }}
          />
        </>
      )}
    </>
  )
}

function FilterLink({
  href, active, label, count,
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
        active ? 'border-violet-600 bg-violet-50' : 'border-border-strong bg-surface hover:bg-surface-muted',
      )}
    >
      {label}
      {count !== undefined ? (
        <span className="tabular text-[0.75rem] text-subtle-foreground">{count}</span>
      ) : null}
    </Link>
  )
}
