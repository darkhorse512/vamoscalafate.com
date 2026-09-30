import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { TourDetailPage } from '@/components/tours/TourDetailPage'
import { buildMetadata } from '@/lib/seo'
import { getPublishedTourSlugs, getRelatedTours, getTourBySlug } from '@/server/queries/tours'

/**
 * Published tours are pre-rendered at build time and revalidated by tag when
 * an admin edits one, so a visitor gets static HTML without the catalogue ever
 * going stale.
 */
export async function generateStaticParams() {
  const tours = await getPublishedTourSlugs()
  return tours
    .filter((t) => t.category.channel === 'excursiones')
    .map((t) => ({ slug: t.slug }))
}

// A slug added after the build is rendered on demand and then cached.
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tour = await getTourBySlug(slug)
  if (!tour) return { title: 'Excursión no encontrada' }

  const cover = tour.images.find((i) => i.isCover)?.media ?? tour.images[0]?.media

  return buildMetadata({
    title: tour.name,
    description: tour.summary,
    path: ROUTES.tour(tour.slug),
    imageUrl: cover?.url ?? null,
    imageAlt: cover?.altText ?? tour.name,
    seo: tour.seo,
  })
}

export default async function TourPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tour = await getTourBySlug(slug)

  if (!tour || tour.category.channel !== 'excursiones') notFound()

  const related = await getRelatedTours(tour.id, 3)

  return (
    <TourDetailPage
      tour={tour}
      related={related}
      path={ROUTES.tour(tour.slug)}
      crumbs={[
        { name: 'Inicio', path: '/' },
        { name: 'Excursiones', path: ROUTES.tours },
        { name: tour.category.name, path: `${ROUTES.tours}?categoria=${tour.category.slug}` },
        { name: tour.name, path: ROUTES.tour(tour.slug) },
      ]}
    />
  )
}
