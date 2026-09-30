import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Atracciones' }
export const dynamic = 'force-dynamic'

type Row = { id: string; name: string; destinationName: string; status: string; slug: string }

export default async function AttractionsPage() {
  await requirePermission('attractions:read')

  const attractions = await prisma.attraction.findMany({
    orderBy: [{ destinationId: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id: true, name: true, slug: true, status: true,
      destination: { select: { name: true } },
    },
  })

  const rows: Row[] = attractions.map((attraction) => ({
    id: attraction.id,
    name: attraction.name,
    slug: attraction.slug,
    status: attraction.status,
    destinationName: attraction.destination.name,
  }))

  const columns: Column<Row>[] = [
    { key: 'name', header: 'Atracción', cell: (row) => row.name },
    { key: 'destination', header: 'Destino', cell: (row) => row.destinationName },
    { key: 'slug', header: 'Slug', cell: (row) => <span className="font-mono text-[0.75rem] text-slate-500">{row.slug}</span> },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Atracciones"
        description="Puntos de interés que se muestran dentro de cada guía de destino."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No hay atracciones cargadas"
          description="Las atracciones enriquecen las guías de destino con información práctica."
        />
      ) : (
        <DataTable columns={columns} rows={rows} caption="Listado de atracciones" />
      )}
    </>
  )
}
