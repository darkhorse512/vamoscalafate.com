import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { BusinessDetail } from '@/components/content/BusinessDetail'
import { buildMetadata } from '@/lib/seo'
import { getBusinessBySlug, getBusinessSlugs } from '@/server/queries/content'

export async function generateStaticParams() {
  const businesses = await getBusinessSlugs()
  return businesses.filter((b) => b.category.channel === 'servicios').map((b) => ({ slug: b.slug }))
}

export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)
  if (!business) return { title: 'Servicio no encontrado' }

  return buildMetadata({
    title: business.name,
    description: business.summary,
    path: ROUTES.service(business.slug),
    imageUrl: business.images[0]?.media.url ?? null,
    seo: business.seo,
  })
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)
  if (!business || business.category.channel !== 'servicios') notFound()

  return (
    <BusinessDetail
      business={business}
      path={ROUTES.service(business.slug)}
      crumbs={[
        { name: 'Inicio', path: '/' },
        { name: 'Servicios', path: ROUTES.services },
        { name: business.name, path: ROUTES.service(business.slug) },
      ]}
    />
  )
}
