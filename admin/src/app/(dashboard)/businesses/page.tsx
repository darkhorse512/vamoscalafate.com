import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Comercios' }
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  slug: string
  status: string
  categoryName: string
  channel: string
  isDemo: boolean
}

export default async function BusinessesPage() {
  await requirePermission('businesses:read')

  const businesses = await prisma.business.findMany({
    orderBy: [{ featured: 'desc' }, { name: 'asc' }],
    take: 100,
    select: {
      id: true, name: true, slug: true, status: true, isDemo: true,
      category: { select: { name: true, channel: true } },
    },
  })

  const rows: Row[] = businesses.map((business) => ({
    id: business.id,
    name: business.name,
    slug: business.slug,
    status: business.status,
    categoryName: business.category.name,
    channel: business.category.channel,
    isDemo: business.isDemo,
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
    { key: 'category', header: 'Categoría', cell: (row) => row.categoryName },
    { key: 'channel', header: 'Sección', cell: (row) => row.channel },
    { key: 'slug', header: 'Slug', cell: (row) => <span className="font-mono text-[0.75rem] text-subtle-foreground">{row.slug}</span> },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Comercios y servicios"
        description="Restaurantes, alquiler de autos, equipamiento y otros servicios de la guía."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No hay comercios publicados"
          description="Aprobá una solicitud de alta para publicar el primero."
        />
      ) : (
        <DataTable columns={columns} rows={rows} caption="Listado de comercios" />
      )}
    </>
  )
}
