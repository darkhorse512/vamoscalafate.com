import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TourFilters } from './TourFilters'
import { TourGrid } from './TourGrid'
import { getTourCategories, getTourFacets, listTours } from '@/server/queries/tours'
import { tourFiltersSchema } from '@vamos/validation'
import { buildQuery, cn } from '@/lib/utils'
import { PageBanner } from '@/components/marketing/PageBanner'

/**
 * Shared catalogue page for every product channel (excursiones, traslados,
 * servicios). One implementation means the three routes cannot drift apart in
 * filtering, pagination or SEO behaviour.
 *
 * Filters are parsed with Zod: query strings are attacker-controlled, so an
 * out-of-range page number or a bogus sort key is coerced to a safe default
 * rather than reaching the query builder.
 */
export async function TourChannelPage({
  channel,
  basePath,
  title,
  description,
  eyebrow,
  searchParams,
}: {
  channel: string
  basePath: string
  title: string
  description: string
  eyebrow: string
  searchParams: Record<string, string | string[] | undefined>
}) {
  const parsed = tourFiltersSchema.safeParse(searchParams)
  const filters = parsed.success ? parsed.data : tourFiltersSchema.parse({})

  const [result, categories, facets] = await Promise.all([
    listTours({
      channel,
      categorySlug: filters.categoria,
      destinationSlug: filters.destino,
      difficulty: filters.dificultad,
      maxPriceCents: filters.precioMax,
      minPriceCents: filters.precioMin,
      maxDurationMinutes: filters.duracionMax,
      minDurationMinutes: filters.duracionMin,
      availableOn: filters.fecha,
      query: filters.q,
      sort: filters.orden,
      page: filters.page,
      pageSize: 12,
    }),
    getTourCategories(channel),
    getTourFacets(channel),
  ])

  // A page number past the end is a 404, not an empty grid - it stops thin
  // paginated URLs accumulating in the index.
  if (filters.page > 1 && result.items.length === 0) notFound()

  const activeCategory = categories.find((c) => c.slug === filters.categoria)

  return (
    <>
      <PageBanner imageSlug={channel === 'traslados' ? 'lago-argentino' : channel === 'servicios' ? 'el-calafate' : 'glaciar-perito-moreno'}>
          <Breadcrumbs tone="light"
            items={[
              { name: 'Inicio', path: '/' },
              { name: title, path: basePath },
              ...(activeCategory
                ? [{ name: activeCategory.name, path: `${basePath}?categoria=${activeCategory.slug}` }]
                : []),
            ]}
          />

          <SectionHeading
            tone="light"
            as="h1"
            eyebrow={eyebrow}
            title={activeCategory ? activeCategory.name : title}
            description={activeCategory?.description ?? description}
            className="mt-5"
          />
      </PageBanner>

      <div className="container-page py-10 sm:py-12">
        <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
          <TourFilters
            basePath={basePath}
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
              count: c._count.tours,
            }))}
            facets={facets}
            totalResults={result.total}
          />

          <div className="lg:col-start-2 lg:row-start-2">
            {result.items.length === 0 ? (
              <EmptyState basePath={basePath} />
            ) : (
              <>
                <TourGrid tours={result.items} columns={3} priorityCount={3} />
                <Pagination
                  basePath={basePath}
                  page={result.page}
                  totalPages={result.totalPages}
                  searchParams={searchParams}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function EmptyState({ basePath }: { basePath: string }) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface-muted px-6 py-16 text-center">
      <h2 className="font-display text-lg font-semibold text-heading">
        No encontramos experiencias con esos filtros
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Probá ampliando el rango de fechas o quitando algún filtro. También podés escribirnos y
        armamos una propuesta a medida.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={basePath}
          className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          Ver todo el catálogo
        </Link>
        <Link
          href="/contacto"
          className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
        >
          Hacer una consulta
        </Link>
      </div>
    </div>
  )
}

/**
 * Pagination as real links, not buttons: crawlers follow them, and a visitor
 * can open page 2 in a new tab.
 */
function Pagination({
  basePath,
  page,
  totalPages,
  searchParams,
}: {
  basePath: string
  page: number
  totalPages: number
  searchParams: Record<string, string | string[] | undefined>
}) {
  if (totalPages <= 1) return null

  const flat = Object.fromEntries(
    Object.entries(searchParams)
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      .filter((e): e is [string, string] => Boolean(e[1])),
  )

  const href = (target: number) =>
    buildQuery(basePath, flat, { page: target > 1 ? target : undefined })

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  )

  return (
    <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="rounded-control border border-border-strong px-3.5 py-2 text-sm font-medium text-foreground hover:border-primary hover:bg-surface-muted"
        >
          Anterior
        </Link>
      ) : null}

      {pages.map((p, index) => (
        <span key={p} className="flex items-center gap-1.5">
          {index > 0 && p - pages[index - 1]! > 1 ? (
            <span className="px-1 text-subtle-foreground" aria-hidden="true">
              …
            </span>
          ) : null}

          <Link
            href={href(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'grid size-10 place-items-center rounded-control text-sm font-medium transition-colors',
              p === page
                ? 'bg-violet-700 text-white'
                : 'border border-border-strong text-foreground hover:border-primary hover:bg-surface-muted',
            )}
          >
            {p}
          </Link>
        </span>
      ))}

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className="rounded-control border border-border-strong px-3.5 py-2 text-sm font-medium text-foreground hover:border-primary hover:bg-surface-muted"
        >
          Siguiente
        </Link>
      ) : null}
    </nav>
  )
}
