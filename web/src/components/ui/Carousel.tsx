'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Horizontal carousel.
 *
 * Built on native CSS scroll-snap rather than a JavaScript animation library:
 *
 *  · Touch gestures, momentum and rubber-banding come from the platform and
 *    feel correct on every device. A JS reimplementation never quite does.
 *  · It works before hydration — the slides are already laid out and
 *    scrollable, so a slow connection still gets a usable component.
 *  · Slides are Server Components passed as `children`, so the cards inside
 *    ship no client JavaScript of their own.
 *
 * The client code here does only what CSS cannot: enable and disable the
 * arrows at the ends, and track which slide is showing.
 */
export function Carousel({
  children,
  ariaLabel,
  /** Tailwind basis classes controlling how many slides are visible. */
  slideClass = 'basis-[86%] sm:basis-[48%] lg:basis-[31.5%]',
  className,
  showDots = true,
}: {
  children: React.ReactNode
  ariaLabel: string
  slideClass?: string
  className?: string
  showDots?: boolean
}) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [slideCount, setSlideCount] = useState(0)

  /** Recomputes arrow state and the active dot from the scroll position. */
  const sync = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const { scrollLeft, scrollWidth, clientWidth } = track
    // 2px tolerance: sub-pixel layout means scrollLeft rarely hits 0 exactly.
    setAtStart(scrollLeft <= 2)
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 2)

    const slides = Array.from(track.children) as HTMLElement[]
    setSlideCount(slides.length)

    // The active slide is whichever starts nearest the container's left edge.
    let nearest = 0
    let smallest = Number.POSITIVE_INFINITY
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - track.offsetLeft - scrollLeft)
      if (distance < smallest) {
        smallest = distance
        nearest = index
      }
    })
    setActiveIndex(nearest)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    sync()
    track.addEventListener('scroll', sync, { passive: true })

    // Slide widths are percentage-based, so a resize changes everything.
    const observer = new ResizeObserver(sync)
    observer.observe(track)

    return () => {
      track.removeEventListener('scroll', sync)
      observer.disconnect()
    }
  }, [sync])

  /** Scrolls by one slide width, honouring the reduced-motion preference. */
  const scrollByPage = useCallback((direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return

    const first = track.firstElementChild as HTMLElement | null
    const step = first ? first.getBoundingClientRect().width + 20 : track.clientWidth * 0.8

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    track.scrollBy({ left: step * direction, behavior: prefersReduced ? 'auto' : 'smooth' })
  }, [])

  const goTo = useCallback((index: number) => {
    const track = trackRef.current
    if (!track) return
    const slide = track.children[index] as HTMLElement | undefined
    if (!slide) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({
      left: slide.offsetLeft - track.offsetLeft,
      behavior: prefersReduced ? 'auto' : 'smooth',
    })
  }, [])

  return (
    <div className={cn('relative', className)}>
      <ul
        ref={trackRef}
        // `group` on the section lets the arrows fade in on hover.
        className={cn(
          'no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5',
          // Room for the card shadow so it is not clipped by overflow.
          'py-2 sm:-mx-1 sm:px-1',
        )}
        // Keyboard users can focus the track and scroll it with arrow keys.
        tabIndex={0}
        role="region"
        aria-label={ariaLabel}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            scrollByPage(1)
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            scrollByPage(-1)
          }
        }}
      >
        {Array.isArray(children)
          ? children.map((child, index) => (
              <li
                key={index}
                className={cn('flex shrink-0 snap-start', slideClass)}
                aria-label={`${index + 1} de ${Array.isArray(children) ? children.length : ''}`}
              >
                {child}
              </li>
            ))
          : children}
      </ul>

      {/* Arrows: desktop only. On touch, swiping is the natural gesture and a
          floating arrow just covers content. */}
      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        disabled={atStart}
        aria-label="Anterior"
        className={cn(
          'absolute -left-4 top-[38%] hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white/95 text-lenga-800 shadow-raised backdrop-blur transition-all lg:grid',
          'hover:border-glacier-300 hover:text-glacier-800',
          atStart && 'pointer-events-none opacity-0',
        )}
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => scrollByPage(1)}
        disabled={atEnd}
        aria-label="Siguiente"
        className={cn(
          'absolute -right-4 top-[38%] hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white/95 text-lenga-800 shadow-raised backdrop-blur transition-all lg:grid',
          'hover:border-glacier-300 hover:text-glacier-800',
          atEnd && 'pointer-events-none opacity-0',
        )}
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>

      {showDots && slideCount > 1 ? (
        <div className="mt-5 flex justify-center gap-1.5" role="tablist" aria-label="Ir a la diapositiva">
          {Array.from({ length: slideCount }, (_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`Ir al elemento ${index + 1}`}
              onClick={() => goTo(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                index === activeIndex
                  ? 'w-7 bg-glacier-700'
                  : 'w-1.5 bg-stone-300 hover:bg-stone-400',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
