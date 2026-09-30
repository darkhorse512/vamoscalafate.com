import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { TourChannelPage } from '@/components/tours/TourChannelPage'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Traslados en El Calafate',
  description:
    'Traslados entre el Aeropuerto Comandante Armando Tola y El Calafate, y conexiones con El Chaltén. Servicio compartido y privado con seguimiento de vuelo.',
  path: ROUTES.transfers,
})

export default async function TrasladosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <TourChannelPage
      channel="traslados"
      basePath={ROUTES.transfers}
      eyebrow="Movilidad"
      title="Traslados"
      description="Del aeropuerto al centro y de El Calafate a El Chaltén. Reservá con anticipación y llegá sin resolverlo sobre la marcha."
      searchParams={await searchParams}
    />
  )
}
