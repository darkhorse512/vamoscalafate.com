import type { TourCard as TourCardData } from '@vamos/types'
import { cn } from '@/lib/utils'
import { TourCard } from './TourCard'

export function TourGrid({
  tours,
  columns = 3,
  priorityCount = 0,
  className,
}: {
  tours: TourCardData[]
  columns?: 2 | 3 | 4
  /** Number of leading cards rendered with an eager image. */
  priorityCount?: number
  className?: string
}) {
  if (tours.length === 0) return null

  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <ul className={cn('grid grid-cols-1 gap-5 sm:gap-6', cols[columns], className)}>
      {tours.map((tour, index) => (
        <li key={tour.id} className="flex">
          <TourCard tour={tour} priority={index < priorityCount} className="w-full" />
        </li>
      ))}
    </ul>
  )
}
