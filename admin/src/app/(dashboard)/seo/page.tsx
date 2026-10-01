import Link from 'next/link'
import type { Metadata } from 'next'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { prisma } from '@vamos/db'
import { publicEnv } from '@vamos/shared'
import { Alert, PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'SEO' }
export const dynamic = 'force-dynamic'

/**
 * SEO health overview.
 *
 * Surfaces the problems that actually cost traffic - a published page set to
 * noindex, a missing meta description, a summary too short to serve as one -
 * rather than a vanity score. Each item links to where it is fixed.
 */
export default async function SeoPage() {
  await requirePermission('seo:read')

  const [
    publishedTours, publishedPosts, publishedHotels, publishedDestinations,
    noindexPublished, missingSeoDescription, shortSummaries, missingAltText,
  ] = await Promise.all([
    prisma.tour.count({ where: { status: 'PUBLISHED' } }),
    prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.hotel.count({ where: { status: 'PUBLISHED' } }),
    prisma.destination.count({ where: { status: 'PUBLISHED' } }),

    // The highest-impact misconfiguration: live but de-indexed.
    prisma.tour.findMany({
      where: { status: 'PUBLISHED', seo: { noindex: true } },
      select: { id: true, name: true, slug: true },
      take: 20,
    }),

    prisma.tour.findMany({
      where: { status: 'PUBLISHED', OR: [{ seoId: null }, { seo: { description: null } }] },
      select: { id: true, name: true, summary: true },
      take: 20,
    }),

    prisma.tour.findMany({
      where: { status: 'PUBLISHED', summary: { not: '' } },
      select: { id: true, name: true, summary: true },
      take: 100,
    }),

    prisma.media.count({ where: { type: 'IMAGE', OR: [{ altText: null }, { altText: '' }] } }),
  ])

  // A summary under ~70 characters makes a thin meta description.
  const thinSummaries = shortSummaries.filter((tour) => tour.summary.length < 70)
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const totalIndexable = publishedTours + publishedPosts + publishedHotels + publishedDestinations

  return (
    <>
      <PageHeader
        title="SEO"
        description="Estado de indexación del sitio y problemas que conviene corregir."
      />

      <section aria-label="Resumen" className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Páginas indexables" value={totalIndexable} />
        <Stat label="Excursiones" value={publishedTours} />
        <Stat label="Artículos" value={publishedPosts} />
        <Stat label="Destinos" value={publishedDestinations} />
      </section>

      <section className="admin-panel mb-6 p-4">
        <h2 className="text-[0.875rem] font-semibold text-heading">
          Verificación en Search Console
        </h2>
        <ul className="mt-3 space-y-2 text-[0.8125rem]">
          <li className="flex items-start gap-2">
            {publicEnv.NEXT_PUBLIC_GSC_VERIFICATION ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden="true" />
            )}
            <span className="text-foreground">
              Meta de verificación:{' '}
              {publicEnv.NEXT_PUBLIC_GSC_VERIFICATION
                ? 'configurada'
                : 'falta NEXT_PUBLIC_GSC_VERIFICATION en el entorno'}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
            <span className="text-foreground">
              Sitemap:{' '}
              <a
                href={`${siteUrl}/sitemap.xml`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {siteUrl}/sitemap.xml
              </a>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
            <span className="text-foreground">
              robots.txt:{' '}
              <a
                href={`${siteUrl}/robots.txt`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {siteUrl}/robots.txt
              </a>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden="true" />
            <span className="text-foreground">
              El panel de administración está excluido de la indexación en todos sus niveles.
            </span>
          </li>
        </ul>
      </section>

      {noindexPublished.length > 0 ? (
        <section className="mb-6">
          <Alert tone="danger" title="Páginas publicadas con noindex">
            <p className="mt-1">
              Estas excursiones están publicadas pero no aparecerán en Google. Revisá si es
              intencional.
            </p>
            <ul className="mt-2 space-y-1">
              {noindexPublished.map((tour) => (
                <li key={tour.id}>
                  <Link href={`/tours/${tour.id}/edit`} className="underline">
                    {tour.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Alert>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-panel overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-[0.8125rem] font-semibold text-heading">
            Sin descripción SEO propia ({missingSeoDescription.length})
          </h2>

          {missingSeoDescription.length === 0 ? (
            <p className="px-4 py-8 text-center text-[0.8125rem] text-subtle-foreground">
              Todas las excursiones publicadas tienen descripción.
            </p>
          ) : (
            <>
              <p className="border-b border-border bg-surface-muted px-4 py-2 text-[0.75rem] text-subtle-foreground">
                Sin descripción propia se usa el resumen, lo cual suele funcionar. Escribir una
                específica da más control sobre el fragmento en Google.
              </p>
              <ul className="divide-y divide-border">
                {missingSeoDescription.map((tour) => (
                  <li key={tour.id} className="px-4 py-2.5">
                    <Link
                      href={`/tours/${tour.id}/edit`}
                      className="text-[0.8125rem] text-primary hover:underline"
                    >
                      {tour.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="admin-panel overflow-hidden">
          <h2 className="border-b border-border px-4 py-3 text-[0.8125rem] font-semibold text-heading">
            Resúmenes demasiado cortos ({thinSummaries.length})
          </h2>

          {thinSummaries.length === 0 ? (
            <p className="px-4 py-8 text-center text-[0.8125rem] text-subtle-foreground">
              Todos los resúmenes tienen longitud suficiente.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {thinSummaries.map((tour) => (
                <li key={tour.id} className="px-4 py-2.5">
                  <Link
                    href={`/tours/${tour.id}/edit`}
                    className="text-[0.8125rem] text-primary hover:underline"
                  >
                    {tour.name}
                  </Link>
                  <p className="mt-0.5 text-[0.75rem] text-subtle-foreground">
                    {tour.summary.length} caracteres - apuntá a 120–160
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {missingAltText > 0 ? (
        <section className="mt-6">
          <Alert tone="warning" title="Imágenes sin texto alternativo">
            Hay {missingAltText} imágenes sin texto alternativo. Afecta la accesibilidad y el
            posicionamiento en búsqueda de imágenes.{' '}
            <Link href="/media" className="underline">
              Completar en la biblioteca de medios
            </Link>
            .
          </Alert>
        </section>
      ) : null}
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-panel p-4">
      <p className="text-[0.75rem] font-medium text-subtle-foreground">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-heading">{value}</p>
    </div>
  )
}
