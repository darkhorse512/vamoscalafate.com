import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { TourDetailPage } from '@/components/tours/TourDetailPage'
import { buildMetadata } from '@/lib/seo'
import { getPublishedTourSlugs, getRelatedTours, getTourBySlug } from '@/server/queries/tours'

export async function generateStaticParams() {
  const tours = await getPublishedTourSlugs()
  return tours.filter((t) => t.category.channel === 'traslados').map((t) => ({ slug: t.slug }))
}

export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tour = await getTourBySlug(slug)
  if (!tour) return { title: 'Traslado no encontrado' }

  const cover = tour.images.find((i) => i.isCover)?.media ?? tour.images[0]?.media

  return buildMetadata({
    title: tour.name,
    description: tour.summary,
    path: ROUTES.transfer(tour.slug),
    imageUrl: cover?.url ?? null,
    seo: tour.seo,
  })
}

export default async function TransferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tour = await getTourBySlug(slug)

  if (!tour || tour.category.channel !== 'traslados') notFound()

  const related = await getRelatedTours(tour.id, 3)

  return (
    <TourDetailPage
      tour={tour}
      related={related}
      path={ROUTES.transfer(tour.slug)}
      crumbs={[
        { name: 'Inicio', path: '/' },
        { name: 'Traslados', path: ROUTES.transfers },
        { name: tour.name, path: ROUTES.transfer(tour.slug) },
      ]}
    />
  )
}
