import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { prisma } from '@vamos/db'
import { publicEnv } from '@vamos/shared'
import { TourForm } from '@/components/TourForm'
import { tourToFormData } from '@/lib/tour-form-data'
import { AvailabilityManager } from '@/components/AvailabilityManager'
import { PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Editar excursión' }
export const dynamic = 'force-dynamic'

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('tours:update')
  const { id } = await params

  const [tour, categories, destinations] = await Promise.all([
    prisma.tour.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        options: { orderBy: { sortOrder: 'asc' } },
        itinerary: { orderBy: { sortOrder: 'asc' } },
        pickupLocations: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        seo: true,
        category: { select: { channel: true } },
      },
    }),
    prisma.tourCategory.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ channel: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, channel: true },
    }),
    prisma.destination.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  if (!tour) notFound()

  const publicPath =
    tour.category.channel === 'traslados'
      ? `/traslados/${tour.slug}`
      : tour.category.channel === 'servicios'
        ? `/servicios/${tour.slug}`
        : `/excursiones/${tour.slug}`

  const publicUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}${publicPath}`

  return (
    <>
      <Link
        href="/tours"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Volver a excursiones
      </Link>

      <PageHeader
        title={tour.name}
        description={publicPath}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={tour.status} />
            {tour.status === 'PUBLISHED' ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-glacier-700 hover:text-glacier-900"
              >
                Ver publicada
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        }
      />

      <AvailabilityManager
        tourId={tour.id}
        options={tour.options
          .filter((option) => option.isActive)
          .map((option) => ({ id: option.id, name: option.name, capacity: option.capacity }))}
      />

      <div className="mt-6">
        <TourForm
          initial={tourToFormData(tour)}
          categories={categories}
          destinations={destinations}
        />
      </div>
    </>
  )
}
