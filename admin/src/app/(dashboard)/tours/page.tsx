import Link from 'next/link'
import type { Metadata } from 'next'
import { Plus } from 'lucide-react'
import { prisma, type Prisma } from '@vamos/db'
import { can, formatDuration, formatMoney } from '@vamos/shared'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { ButtonLink, EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Excursiones' }
export const dynamic = 'force-dynamic'

type TourRow = {
  id: string
  name: string
  slug: string
  status: string
  categoryName: string
  fromPriceCents: number | null
  currency: string
  durationMinutes: number
  optionCount: number
  bookingCount: number
  isDemo: boolean
}

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requirePermission('tours:read')

  const params = await searchParams
  const str = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : undefined)

  const status = str('status')
  const query = str('q')
  const channel = str('channel')
  const page = Math.max(1, Number(str('page')) || 1)
  const pageSize = 25

  const where: Prisma.TourWhereInput = {
    ...(status ? { status: status as Prisma.TourWhereInput['status'] } : {}),
    ...(channel ? { category: { channel } } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [tours, total] = await Promise.all([
    prisma.tour.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, slug: true, status: true, fromPriceCents: true,
        currency: true, durationMinutes: true, isDemo: true,
        category: { select: { name: true } },
        _count: { select: { options: true, bookingItems: true } },
      },
    }),
    prisma.tour.count({ where }),
  ])

  const rows: TourRow[] = tours.map((tour) => ({
    id: tour.id,
    name: tour.name,
    slug: tour.slug,
    status: tour.status,
    categoryName: tour.category.name,
    fromPriceCents: tour.fromPriceCents,
    currency: tour.currency,
    durationMinutes: tour.durationMinutes,
    optionCount: tour._count.options,
    bookingCount: tour._count.bookingItems,
    isDemo: tour.isDemo,
  }))

  const columns: Column<TourRow>[] = [
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
    {
      key: 'price',
      header: 'Desde',
      numeric: true,
      cell: (row) =>
        row.fromPriceCents !== null ? formatMoney(row.fromPriceCents, row.currency) : '—',
    },
    { key: 'duration', header: 'Duración', cell: (row) => formatDuration(row.durationMinutes) },
    { key: 'options', header: 'Opciones', numeric: true, cell: (row) => String(row.optionCount) },
    { key: 'bookings', header: 'Reservas', numeric: true, cell: (row) => String(row.bookingCount) },
    { key: 'status', header: 'Estado', cell: (row) => <StatusBadge status={row.status} /> },
  ]

  const canCreate = can(session.role, 'tours:create')

  return (
    <>
      <PageHeader
        title="Excursiones"
        description={`${total} productos en el catálogo.`}
        action={
          canCreate ? (
            <ButtonLink href="/tours/new" size="sm">
              <Plus className="size-4" aria-hidden="true" />
              Nueva excursión
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
          <FilterLink href="/tours" active={!status && !channel} label="Todas" />
          {['PUBLISHED', 'DRAFT', 'ARCHIVED'].map((value) => (
            <FilterLink
              key={value}
              href={`/tours?status=${value}`}
              active={status === value}
              label={<StatusBadge status={value} />}
            />
          ))}
          <FilterLink
            href="/tours?channel=traslados"
            active={channel === 'traslados'}
            label="Traslados"
          />
        </nav>

        <form method="get" action="/tours" className="ml-auto flex gap-2">
          <label htmlFor="q" className="sr-only">
            Buscar excursiones
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Nombre o slug…"
            className="admin-input max-w-[16rem]"
          />
          <button
            type="submit"
            className="h-9.5 rounded-control border border-slate-300 bg-white px-4 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-50"
          >
            Buscar
          </button>
        </form>
      </div>

      {rows.length === 0 && !query && !status ? (
        <EmptyState
          title="Todavía no hay excursiones"
          description="Creá tu primera experiencia para empezar a vender online."
          action={canCreate ? <ButtonLink href="/tours/new" size="sm">Nueva excursión</ButtonLink> : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowHref={(row) => `/tours/${row.id}/edit`}
            caption="Listado de excursiones"
            emptyMessage="No hay excursiones que coincidan con el filtro."
          />
          <Pagination
            basePath="/tours"
            page={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            searchParams={{ status, q: query, channel }}
          />
        </>
      )}
    </>
  )
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center rounded-control border px-2.5 py-1.5 text-[0.8125rem] transition-colors',
        active ? 'border-glacier-600 bg-glacier-50' : 'border-slate-300 bg-white hover:bg-slate-50',
      )}
    >
      {label}
    </Link>
  )
}
