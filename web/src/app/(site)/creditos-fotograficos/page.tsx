import type { Metadata } from 'next'
import { ExternalLink } from 'lucide-react'
import { ROUTES, absoluteUrl } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageBanner } from '@/components/marketing/PageBanner'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/media/SmartImage'
import { authorLabel } from '@/components/media/PhotoCredit'
import { getLicensedPhotos } from '@/server/queries/home'

export const metadata: Metadata = {
  title: 'Créditos fotográficos',
  description: 'Autores y licencias de las fotografías publicadas en Vamos Calafate.',
  alternates: { canonical: absoluteUrl(ROUTES.photoCredits) },
}

/**
 * Attribution for every licensed photograph on the site.
 *
 * CC BY and CC BY-SA allow commercial use on condition that the author and
 * licence are credited "in any reasonable manner". A dedicated credits page,
 * linked from every page's footer, is the established way to do that without
 * printing text over the photographs themselves.
 */
export default async function PhotoCreditsPage() {
  const photos = await getLicensedPhotos()

  return (
    <>
      <PageBanner>
        <Breadcrumbs
          tone="light"
          items={[
            { name: 'Inicio', path: '/' },
            { name: 'Créditos fotográficos', path: ROUTES.photoCredits },
          ]}
        />
        <SectionHeading
          tone="light"
          as="h1"
          eyebrow="Agradecimientos"
          title="Créditos fotográficos"
          description="Muchas de las fotografías de este sitio fueron publicadas por sus autores bajo licencias Creative Commons. Gracias a cada uno de ellos."
          className="mt-5"
        />
      </PageBanner>

      <div className="container-page py-12 sm:py-16">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="flex gap-4 rounded-[1.25rem] border border-border bg-surface p-3 shadow-subtle"
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-card">
                <SmartImage media={photo} seed={photo.id} alt={photo.altText ?? ''} sizes="96px" />
              </div>
              <div className="min-w-0 py-1 text-[0.8125rem]">
                <p className="line-clamp-2 font-semibold leading-snug text-heading">
                  {photo.altText ?? photo.caption ?? 'Fotografía'}
                </p>
                <p className="mt-1.5 text-muted-foreground">
                  Autor:{' '}
                  {photo.attributionUrl ? (
                    <a
                      href={photo.attributionUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-medium text-primary hover:underline"
                    >
                      {authorLabel(photo.attributionText) ?? 'Autor desconocido'}
                    </a>
                  ) : (
                    (authorLabel(photo.attributionText) ?? 'Autor desconocido')
                  )}
                </p>
                <p className="mt-0.5 text-muted-foreground">Licencia: {photo.license}</p>
                {photo.sourceUrl ? (
                  <a
                    href={photo.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Ver original
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
