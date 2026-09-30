import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { BusinessDetail } from '@/components/content/BusinessDetail'
import { buildMetadata } from '@/lib/seo'
import { getBusinessBySlug, getBusinessSlugs } from '@/server/queries/content'

export async function generateStaticParams() {
  const businesses = await getBusinessSlugs()
  return businesses.filter((b) => b.category.channel === 'restaurantes').map((b) => ({ slug: b.slug }))
}

export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)
  if (!business) return { title: 'Comercio no encontrado' }

  return buildMetadata({
    title: business.name,
    description: business.summary,
    path: ROUTES.restaurant(business.slug),
    imageUrl: business.images[0]?.media.url ?? null,
    seo: business.seo,
  })
}

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)
  if (!business || business.category.channel !== 'restaurantes') notFound()

  return (
    <BusinessDetail
      business={business}
      path={ROUTES.restaurant(business.slug)}
      crumbs={[
        { name: 'Inicio', path: '/' },
        { name: 'Restaurantes', path: ROUTES.restaurants },
        { name: business.name, path: ROUTES.restaurant(business.slug) },
      ]}
    />
  )
}
