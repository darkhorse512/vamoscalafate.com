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
 * Underneath sits a control bar: a slim scrollbar whose thumb is as wide as
 * the visible share of the row and sits where the view is — it can be
 * dragged, and clicking the track jumps there — plus a position counter and
 * the arrows. On desktop the row can also be dragged with the mouse; touch
 * keeps the native swipe.
 */
export function Carousel({
  children,
  ariaLabel,
  /** Tailwind basis classes controlling how many slides are visible. */
  slideClass = 'basis-[86%] sm:basis-[48%] lg:basis-[31.5%]',
  className,
}: {
  children: React.ReactNode
  ariaLabel: string
  slideClass?: string
  className?: string
}) {
  const trackRef = useRef<HTMLUListElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [slideCount, setSlideCount] = useState(0)
  /** Thumb geometry as fractions of the track: width and left offset. */
  const [thumb, setThumb] = useState({ size: 1, offset: 0 })
  const [dragging, setDragging] = useState(false)

  /** Recomputes arrows, counter and thumb from the scroll position. */
  const sync = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const { scrollLeft, scrollWidth, clientWidth } = track
    // 2px tolerance: sub-pixel layout means scrollLeft rarely hits 0 exactly.
    setAtStart(scrollLeft <= 2)
    setAtEnd(scrollLeft + clientWidth >= scrollWidth - 2)

    const size = scrollWidth > 0 ? Math.min(1, clientWidth / scrollWidth) : 1
    const maxScroll = Math.max(1, scrollWidth - clientWidth)
    setThumb({ size, offset: (scrollLeft / maxScroll) * (1 - size) })

    const slides = Array.from(track.children) as HTMLElement[]
    setSlideCount(slides.length)

    // The active slide is whichever starts nearest the container's left edge;
    // at the very end, the last slide (it may never reach the left edge).
    let nearest = 0
    let smallest = Number.POSITIVE_INFINITY
    slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - track.offsetLeft - scrollLeft)
      if (distance < smallest) {
        smallest = distance
        nearest = index
      }
    })
    setActiveIndex(scrollLeft + clientWidth >= scrollWidth - 2 ? slides.length - 1 : nearest)
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

  const behavior = (): ScrollBehavior =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

  /** Scrolls by one slide width. */
  const scrollByPage = useCallback((direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const first = track.firstElementChild as HTMLElement | null
    const step = first ? first.getBoundingClientRect().width + 20 : track.clientWidth * 0.8
    track.scrollBy({ left: step * direction, behavior: behavior() })
  }, [])

  // ── Mouse drag on the slides (desktop) ───────────────────────────────────
  /*
   * Scroll-snap fights a manual drag, so it is suspended while dragging and
   * restored afterwards, letting the browser settle on the nearest slide. A
   * drag must not also count as a click on the card under the pointer, so a
   * movement past a few pixels swallows the click that follows.
   */
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false })

  function onTrackPointerDown(event: React.PointerEvent<HTMLUListElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const track = trackRef.current
    if (!track) return
    drag.current = { active: true, startX: event.clientX, startScroll: track.scrollLeft, moved: false }
  }

  function onTrackPointerMove(event: React.PointerEvent<HTMLUListElement>) {
    const track = trackRef.current
    const state = drag.current
    if (!track || !state.active) return
    const delta = event.clientX - state.startX
    if (!state.moved && Math.abs(delta) > 5) {
      state.moved = true
      setDragging(true)
      track.setPointerCapture(event.pointerId)
    }
    if (state.moved) track.scrollLeft = state.startScroll - delta
  }

  function endTrackDrag(event: React.PointerEvent<HTMLUListElement>) {
    const track = trackRef.current
    if (!drag.current.active) return
    drag.current.active = false
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
    setDragging(false)
  }

  // ── Scrollbar thumb drag and track click ────────────────────────────────
  const thumbDrag = useRef({ active: false, startX: 0, startScroll: 0 })

  function onThumbPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track) return
    event.preventDefault()
    event.stopPropagation()
    thumbDrag.current = { active: true, startX: event.clientX, startScroll: track.scrollLeft }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  function onThumbPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    const bar = barRef.current
    if (!track || !bar || !thumbDrag.current.active) return
    // Convert pointer travel along the bar into scroll distance.
    const ratio = (track.scrollWidth - track.clientWidth) / (bar.clientWidth * (1 - thumb.size) || 1)
    track.scrollLeft = thumbDrag.current.startScroll + (event.clientX - thumbDrag.current.startX) * ratio
  }

  function onThumbPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    thumbDrag.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
  }

  function onBarPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    const bar = barRef.current
    if (!track || !bar) return
    const rect = bar.getBoundingClientRect()
    // Centre the thumb on the pressed point.
    const fraction = (event.clientX - rect.left) / rect.width - thumb.size / 2
    const clamped = Math.min(1 - thumb.size, Math.max(0, fraction))
    track.scrollTo({
      left: (clamped / Math.max(0.0001, 1 - thumb.size)) * (track.scrollWidth - track.clientWidth),
      behavior: behavior(),
    })
  }

  const scrollable = thumb.size < 0.999
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className={cn('relative', className)}>
      <ul
        ref={trackRef}
        className={cn(
          'no-scrollbar -mx-5 flex gap-5 overflow-x-auto px-5 sm:-mx-1 sm:px-1',
          // Room for the card shadow and hover lift so they are not clipped.
          'pb-3 pt-2',
          dragging ? 'cursor-grabbing select-none snap-none' : 'snap-x snap-mandatory scroll-smooth lg:cursor-grab',
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
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={endTrackDrag}
        onPointerCancel={endTrackDrag}
        onClickCapture={(event) => {
          if (drag.current.moved) {
            event.preventDefault()
            event.stopPropagation()
            drag.current.moved = false
          }
        }}
        onDragStart={(event) => event.preventDefault()}
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

      {/* ── Control bar ─────────────────────────────────────────────── */}
      {scrollable ? (
        <div className="mt-5 flex items-center gap-4 sm:gap-6">
          <div
            ref={barRef}
            onPointerDown={onBarPointerDown}
            className="group relative h-7 flex-1 cursor-pointer touch-none"
            aria-hidden="true"
          >
            {/* Track: a recessed groove */}
            <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-strong shadow-[inset_0_1px_2px_rgb(32_0_51/0.12)] ring-1 ring-inset ring-border" />

            {/* Thumb */}
            <div
              onPointerDown={onThumbPointerDown}
              onPointerMove={onThumbPointerMove}
              onPointerUp={onThumbPointerUp}
              onPointerCancel={onThumbPointerUp}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 cursor-grab overflow-hidden rounded-full active:cursor-grabbing',
                'bg-[linear-gradient(90deg,#6c58fe_0%,#a56afd_45%,#ff2e70_100%)]',
                // Exclusive branches: `cn` does not merge conflicting heights.
                dragging
                  ? 'h-3.5 shadow-[0_0_0_5px_rgb(108_88_254/0.16),0_4px_14px_rgb(108_88_254/0.45)]'
                  : 'h-2 shadow-[0_2px_10px_rgb(108_88_254/0.35)] group-hover:h-3.5 group-hover:shadow-[0_4px_14px_rgb(108_88_254/0.45)]',
              )}
              style={{
                width: `${thumb.size * 100}%`,
                left: `${thumb.offset * 100}%`,
                // No easing on position while dragging, so it tracks the pointer.
                transition: dragging
                  ? 'height 200ms, box-shadow 200ms'
                  : 'left 180ms ease-out, height 200ms, box-shadow 200ms',
              }}
            >
              {/* Glossy highlight along the top edge */}
              <span className="pointer-events-none absolute inset-x-2 top-px h-px rounded-full bg-white/55" />
              {/* Grip, revealed when the thumb swells */}
              <span
                className={cn(
                  'pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-[3px] transition-opacity duration-200',
                  dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <span className="size-[3px] rounded-full bg-white/90" />
                <span className="size-[3px] rounded-full bg-white/90" />
                <span className="size-[3px] rounded-full bg-white/90" />
              </span>
            </div>
          </div>

          <p className="shrink-0 font-display text-sm tabular-nums text-muted-foreground" aria-live="polite">
            <span className="font-bold text-heading">{pad(activeIndex + 1)}</span>
            <span className="mx-1 text-subtle-foreground">/</span>
            {pad(slideCount)}
          </p>

          <div className="flex shrink-0 gap-2">
            <ArrowButton label={`Anterior: ${ariaLabel}`} disabled={atStart} onClick={() => scrollByPage(-1)}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </ArrowButton>
            <ArrowButton label={`Siguiente: ${ariaLabel}`} disabled={atEnd} onClick={() => scrollByPage(1)}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </ArrowButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'grid size-11 place-items-center rounded-full border transition-all duration-200',
        disabled
          ? 'cursor-not-allowed border-border text-subtle-foreground/50'
          : 'border-border-strong bg-surface text-heading shadow-subtle hover:-translate-y-px hover:border-transparent hover:bg-gradient-to-br hover:from-violet-600 hover:to-magenta-500 hover:text-white hover:shadow-[0_8px_20px_rgb(108_88_254/0.3)]',
      )}
    >
      {children}
    </button>
  )
}
