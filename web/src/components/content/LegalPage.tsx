import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Markdown } from '@/components/content/Markdown'
import { breadcrumbSchema, jsonLdScript } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { formatDate } from '@vamos/shared'
import { getStaticPage } from '@/server/queries/content'
import { PageBanner } from '@/components/marketing/PageBanner'

/**
 * Renderer for the editable legal pages.
 *
 * The content lives in the `static_pages` table, so legal copy is changed from
 * the admin rather than in a deploy (spec §65) - which matters, because these
 * are documents a lawyer revises, not developers.
 */
export async function renderLegalMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  const page = await getStaticPage(slug)
  if (!page) return { title: fallbackTitle }

  return buildMetadata({
    title: page.title,
    description: `${page.title} de Vamos Calafate. Información sobre condiciones, derechos y obligaciones.`,
    path: `/${slug}`,
    seo: page.seo,
  })
}

export async function LegalPage({ slug }: { slug: string }) {
  const page = await getStaticPage(slug)
  if (!page) notFound()

  const crumbs = [
    { name: 'Inicio', path: '/' },
    { name: page.title, path: `/${slug}` },
  ]
  const ld = jsonLdScript(breadcrumbSchema(crumbs))

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <PageBanner>
          <Breadcrumbs tone="light" items={crumbs} />
          <h1 className="mt-5 font-display text-display-sm font-bold leading-tight text-white">
            {page.title}
          </h1>
          <p className="mt-3 text-sm text-white/65">
            Última actualización: {formatDate(page.updatedAt)}
          </p>
      </PageBanner>

      <div className="container-prose py-10 sm:py-12">
        <Markdown content={page.content} />
      </div>
    </>
  )
}
