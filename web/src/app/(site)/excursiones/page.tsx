import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { TourChannelPage } from '@/components/tours/TourChannelPage'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Excursiones en El Calafate',
  description:
    'Excursiones al Glaciar Perito Moreno, navegaciones por el Lago Argentino, minitrekking sobre el hielo y salidas de día completo desde El Calafate. Reserva online.',
  path: ROUTES.tours,
})

export default async function ExcursionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <TourChannelPage
      channel="excursiones"
      basePath={ROUTES.tours}
      eyebrow="Catálogo"
      title="Excursiones en El Calafate"
      description="Del frente del Perito Moreno a los glaciares que solo se alcanzan navegando. Elegí la experiencia, la fecha y reservá online."
      searchParams={await searchParams}
    />
  )
}
