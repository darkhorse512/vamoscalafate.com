import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import type { CategoryTile } from '@/server/queries/home'
import { SmartImage } from '@/components/media/SmartImage'
import { cn } from '@/lib/utils'

/**
 * Bento grid of experience types.
 *
 * A photograph per category instead of a text card: "Navegaciones" means
 * little until you see the ice. The first tile is doubled in both directions
 * so the grid reads as a composition rather than a spreadsheet.
 */
export function CategoryTiles({ categories }: { categories: CategoryTile[] }) {
  if (categories.length === 0) return null

  return (
    <ul className="grid auto-rows-[13rem] grid-cols-2 gap-3 sm:auto-rows-[15rem] sm:gap-4 lg:grid-cols-4">
      {categories.slice(0, 7).map((category, index) => (
        <li
          key={category.id}
          className={cn(
            'reveal',
            index === 0 && 'col-span-2 row-span-2',
            index === 3 && categories.length > 5 && 'lg:col-span-2',
          )}
        >
          <Link
            href={`${ROUTES.tours}?categoria=${category.slug}`}
            className="group relative flex size-full flex-col justify-end overflow-hidden rounded-card bg-inverse focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <SmartImage
              media={category.media}
              seed={category.slug}
              alt=""
              sizes={index === 0 ? '(max-width: 1023px) 100vw, 50vw' : '(max-width: 1023px) 50vw, 25vw'}
              className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-plum-950/90 via-plum-950/30 to-transparent transition-opacity duration-500 group-hover:opacity-90" />

            <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/15 text-white opacity-0 ring-1 ring-white/25 backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>

            <div className="relative p-4 sm:p-5">
              <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
                {category.tourCount} {category.tourCount === 1 ? 'experiencia' : 'experiencias'}
              </span>
              <h3
                className={cn(
                  'mt-2 font-display font-semibold leading-tight text-white',
                  index === 0 ? 'text-2xl sm:text-[2rem]' : 'text-lg sm:text-xl',
                )}
              >
                {category.name}
              </h3>
              {category.description ? (
                <p
                  className={cn(
                    'mt-2 text-[0.8125rem] leading-relaxed text-white/80',
                    index === 0
                      ? 'line-clamp-3 max-w-md'
                      : 'line-clamp-2 max-h-0 opacity-0 transition-all duration-500 group-hover:max-h-16 group-hover:opacity-100',
                  )}
                >
                  {category.description}
                </p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
