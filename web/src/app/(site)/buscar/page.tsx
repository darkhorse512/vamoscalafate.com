import Link from 'next/link'
import type { Metadata } from 'next'
import { Search as SearchIcon } from 'lucide-react'
import { ROUTES, formatMoney } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SmartImage } from '@/components/media/SmartImage'
import { SearchInput } from '@/components/content/SearchInput'
import { noindexMetadata } from '@/lib/seo'
import { searchSite } from '@/server/queries/search'

/**
 * Site search.
 *
 * Deliberately `noindex`: an unbounded space of query-string URLs would
 * otherwise fill the index with near-duplicate thin pages (spec §38).
 */
export const metadata: Metadata = noindexMetadata(
  'Buscar',
  'Buscá excursiones, traslados, alojamientos y artículos de la guía de viaje.',
)

export const dynamic = 'force-dynamic'

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q.trim() : ''

  const results = query.length >= 2 ? await searchSite(query) : null

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Buscar', path: ROUTES.search }]} />

      <h1 className="mt-5 font-display text-display-sm font-bold leading-tight text-heading">
        Buscar
      </h1>

      <div className="mt-6 max-w-2xl">
        <SearchInput defaultValue={query} />
      </div>

      {!results ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Escribí al menos 2 caracteres para buscar entre excursiones, traslados, alojamientos,
          comercios, destinos y artículos.
        </p>
      ) : results.total === 0 ? (
        <div className="mt-10 rounded-card border border-dashed border-border-strong bg-surface-muted px-6 py-14 text-center">
          <SearchIcon className="mx-auto size-8 text-subtle-foreground" aria-hidden="true" />
          <h2 className="mt-4 font-display text-lg font-semibold text-heading">
            No encontramos resultados para «{query}»
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Probá con otros términos, o mirá el catálogo completo de excursiones.
          </p>
          <Link
            href={ROUTES.tours}
            className="mt-5 inline-block text-sm font-semibold text-primary underline underline-offset-2"
          >
            Ver todas las excursiones
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            <strong className="font-semibold text-heading">{results.total}</strong>{' '}
            {results.total === 1 ? 'resultado' : 'resultados'} para «{query}»
          </p>

          <div className="mt-8 space-y-10">
            {results.groups.map((group) => (
              <section key={group.type}>
                <h2 className="font-display text-lg font-semibold text-heading">{group.label}</h2>

                <ul className="mt-4 divide-y divide-border border-y border-border">
                  {group.results.map((result) => (
                    <li key={`${result.type}-${result.id}`}>
                      <Link href={result.url} className="flex gap-4 py-4 transition-colors hover:bg-surface-muted">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-[0.3rem] bg-surface-strong sm:size-20">
                          <SmartImage
                            media={
                              result.imageUrl
                                ? {
                                    id: result.id,
                                    url: result.imageUrl,
                                    altText: result.imageAlt,
                                    caption: null,
                                    width: null,
                                    height: null,
                                    blurDataUrl: null,
                                    externalUrl: null,
                                    /*
                                     * Search returns a flat projection with
                                     * no licence data, so no credit is
                                     * rendered on these thumbnails. That is
                                     * the normal reading of "attribution
                                     * reasonable to the medium": the credit
                                     * appears in full on the page each result
                                     * links to, one click away.
                                     */
                                    license: null,
                                    attributionText: null,
                                    attributionUrl: null,
                                    sourceUrl: null,
                                  }
                                : null
                            }
                            seed={result.id}
                            alt={result.title}
                            sizes="80px"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-sans text-[0.9375rem] font-semibold text-heading">
                            {result.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                            {result.excerpt}
                          </p>
                          {result.priceCents ? (
                            <p className="mt-1.5 text-[0.8125rem] font-semibold text-heading">
                              Desde {formatMoney(result.priceCents, result.currency ?? 'ARS')}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
