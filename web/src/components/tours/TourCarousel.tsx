import type { TourCard as TourCardData } from '@vamos/types'
import { Carousel } from '@/components/ui/Carousel'
import { TourCard } from './TourCard'

/**
 * Tour carousel.
 *
 * A Server Component that renders the cards and hands them to the client-side
 * `Carousel` shell as children — so the cards themselves ship no JavaScript,
 * and only the scroll/arrow logic is hydrated.
 */
export function TourCarousel({
  tours,
  ariaLabel,
  priorityCount = 0,
}: {
  tours: TourCardData[]
  ariaLabel: string
  priorityCount?: number
}) {
  if (tours.length === 0) return null

  return (
    <Carousel ariaLabel={ariaLabel}>
      {tours.map((tour, index) => (
        <TourCard
          key={tour.id}
          tour={tour}
          priority={index < priorityCount}
          className="w-full"
        />
      ))}
    </Carousel>
  )
}
