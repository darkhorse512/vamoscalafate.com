import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { formatMoney } from '@vamos/shared'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Hoteles' }
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  slug: string
  status: string
  starRating: number | null
  fromPriceCents: number | null
  currency: string
  fromSubmission: boolean
  isDemo: boolean
}

export default async function HotelsPage() {
  await requirePermission('hotels:read')

  const hotels = await prisma.hotel.findMany({
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    take: 100,
    select: {
      id: true, name: true, slug: true, status: true, starRating: true,
      fromPriceCents: true, currency: true, submissionId: true, isDemo: true,
    },
  })

  const rows: Row[] = hotels.map((hotel) => ({
    id: hotel.id,
    name: hotel.name,
    slug: hotel.slug,
    status: hotel.status,
    starRating: hotel.starRating,
    fromPriceCents: hotel.fromPriceCents,
    currency: hotel.currency,
    fromSubmission: Boolean(hotel.submissionId),
    isDemo: hotel.isDemo,
  }))

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (row) => (
        <span>
          {row.name}
          {row.isDemo ? (
            <span className="ml-2 rounded bg-status-warningBg px-1.5 py-0.5 text-[0.625rem] font-semibold text-status-warning">
              DEMO
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'slug', header: 'Slug', cell: (row) => <span className="font-mono text-[0.75rem] text-subtle-foreground">{row.slug}</span> },
    {
      key: 'stars',
      header: 'Categoría',
      cell: (row) => (row.starRating ? '★'.repeat(row.starRating) : '-'),
    },
    {
      key: 'price',
      header: 'Desde',
      numeric: true,
      cell: (row) => (row.fromPriceCents ? formatMoney(row.fromPriceCents, row.currency) : '-'),
    },
    {
      key: 'origin',
      header: 'Origen',
      cell: (row) => (row.fromSubmission ? 'Solicitud' : 'Carga manual'),
    },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Hoteles y alojamientos"
        description="Fichas de la guía de alojamientos. Las solicitudes aprobadas aparecen acá automáticamente."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No hay alojamientos publicados"
          description="Aprobá una solicitud de alta o creá la ficha manualmente para poblar la guía."
        />
      ) : (
        <DataTable columns={columns} rows={rows} caption="Listado de alojamientos" />
      )}
    </>
  )
}
