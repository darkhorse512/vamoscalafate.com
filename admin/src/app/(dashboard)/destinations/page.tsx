import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Destinos' }
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  slug: string
  status: string
  region: string
  tours: number
  attractions: number
  posts: number
  featured: boolean
}

export default async function DestinationsPage() {
  await requirePermission('destinations:read')

  const destinations = await prisma.destination.findMany({
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    select: {
      id: true, name: true, slug: true, status: true, region: true, featured: true,
      _count: { select: { tours: true, attractions: true, blogPosts: true } },
    },
  })

  const rows: Row[] = destinations.map((destination) => ({
    id: destination.id,
    name: destination.name,
    slug: destination.slug,
    status: destination.status,
    region: destination.region,
    tours: destination._count.tours,
    attractions: destination._count.attractions,
    posts: destination._count.blogPosts,
    featured: destination.featured,
  }))

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Destino',
      cell: (row) => (
        <span>
          {row.name}
          {row.featured ? (
            <span className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-violet-800">
              DESTACADO
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'region', header: 'Región', cell: (row) => row.region },
    { key: 'tours', header: 'Excursiones', numeric: true, cell: (row) => String(row.tours) },
    { key: 'attractions', header: 'Atracciones', numeric: true, cell: (row) => String(row.attractions) },
    { key: 'posts', header: 'Artículos', numeric: true, cell: (row) => String(row.posts) },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Destinos"
        description="Las guías de destino son el centro del enlazado interno: conectan artículos con excursiones."
      />

      {rows.length === 0 ? (
        <EmptyState title="No hay destinos" description="Creá el primer destino para organizar el catálogo." />
      ) : (
        <DataTable columns={columns} rows={rows} caption="Listado de destinos" />
      )}
    </>
  )
}
