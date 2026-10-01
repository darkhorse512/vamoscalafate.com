import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Categorías' }
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  name: string
  slug: string
  channel: string
  status: string
  tours: number
  sortOrder: number
}

export default async function CategoriesPage() {
  await requirePermission('categories:read')

  const [tourCategories, businessCategories] = await Promise.all([
    prisma.tourCategory.findMany({
      orderBy: [{ channel: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true, name: true, slug: true, channel: true, status: true, sortOrder: true,
        _count: { select: { tours: true } },
      },
    }),
    prisma.businessCategory.findMany({
      orderBy: [{ channel: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true, name: true, slug: true, channel: true, sortOrder: true,
        _count: { select: { businesses: true } },
      },
    }),
  ])

  const tourRows: Row[] = tourCategories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    channel: category.channel,
    status: category.status,
    tours: category._count.tours,
    sortOrder: category.sortOrder,
  }))

  const columns: Column<Row>[] = [
    { key: 'name', header: 'Nombre', cell: (row) => row.name },
    { key: 'slug', header: 'Slug', cell: (row) => <span className="font-mono text-[0.75rem] text-subtle-foreground">{row.slug}</span> },
    { key: 'channel', header: 'Sección', cell: (row) => row.channel },
    { key: 'tours', header: 'Excursiones', numeric: true, cell: (row) => String(row.tours) },
    { key: 'sortOrder', header: 'Orden', numeric: true, cell: (row) => String(row.sortOrder) },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Categorías"
        description="La sección («channel») determina en qué ruta pública aparece cada categoría."
      />

      <h2 className="mb-3 text-[0.875rem] font-semibold text-heading">Categorías de excursiones</h2>
      <DataTable columns={columns} rows={tourRows} caption="Categorías de excursiones" />

      <h2 className="mb-3 mt-8 text-[0.875rem] font-semibold text-heading">
        Categorías de comercios
      </h2>
      <div className="admin-panel overflow-hidden">
        <table className="admin-table">
          <caption className="sr-only">Categorías de comercios</caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Slug</th>
              <th scope="col">Sección</th>
              <th scope="col" className="text-right">Comercios</th>
            </tr>
          </thead>
          <tbody>
            {businessCategories.map((category) => (
              <tr key={category.id}>
                <td className="font-medium text-heading">{category.name}</td>
                <td className="font-mono text-[0.75rem] text-subtle-foreground">{category.slug}</td>
                <td>{category.channel}</td>
                <td className="tabular text-right">{category._count.businesses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
