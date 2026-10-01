import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@vamos/db'
import { TourForm } from '@/components/TourForm'
import { EMPTY_TOUR } from '@/lib/tour-form-data'
import { PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Nueva excursión' }
export const dynamic = 'force-dynamic'

export default async function NewTourPage() {
  await requirePermission('tours:create')

  const [categories, destinations] = await Promise.all([
    prisma.tourCategory.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ channel: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, channel: true },
    }),
    prisma.destination.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <>
      <Link
        href="/tours"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-heading"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Volver a excursiones
      </Link>

      <PageHeader
        title="Nueva excursión"
        description="Creá el producto con al menos una opción de precio. Podés guardarlo como borrador y publicarlo más tarde."
      />

      <TourForm initial={EMPTY_TOUR} categories={categories} destinations={destinations} />
    </>
  )
}
