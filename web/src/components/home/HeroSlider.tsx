'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Pause, Play } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import type { HeroSlide } from '@/server/queries/home'
import { ButtonLink } from '@/components/ui/Button'
import { SmartImage } from '@/components/media/SmartImage'
import { PhotoCredit } from '@/components/media/PhotoCredit'
import { cn } from '@/lib/utils'

const DWELL_MS = 7000

/**
 * Full-bleed homepage slider.
 *
 * Every slide is rendered on the server and stacked; switching only toggles
 * opacity. That keeps the first slide's headline as server HTML (the LCP
 * element is text, not an image decode), and means the slider is a readable
 * hero even if JavaScript never arrives.
 *
 * Autoplay is a courtesy, not a requirement, so it stops for anyone who is
 * engaging with it: on hover, on keyboard focus, when the tab is hidden, and
 * entirely under prefers-reduced-motion. A visible pause control satisfies
 * WCAG 2.2.2 for content that moves on its own.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [hidden, setHidden] = useState(false)
  const rootRef = useRef<HTMLElement>(null)

  const count = slides.length
  const running = count > 1 && !paused && !hovered && !reducedMotion && !hidden

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  )

  // Environment signals that should stop the clock.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => setReducedMotion(query.matches)
    const onVisibility = () => setHidden(document.hidden)
    onMotion()
    query.addEventListener('change', onMotion)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      query.removeEventListener('change', onMotion)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // One timer per slide; changing slide or pausing simply cancels it.
  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(() => go(index + 1), DWELL_MS)
    return () => window.clearTimeout(timer)
  }, [running, index, go])

  const active = slides[index] ?? slides[0]
  if (!active) return null

  return (
    <section
      ref={rootRef}
      aria-roledescription="carrusel"
      aria-label="Experiencias destacadas en El Calafate"
      className="relative isolate flex min-h-[min(92svh,50rem)] items-end overflow-hidden bg-inverse"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setHovered(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') go(index + 1)
        if (event.key === 'ArrowLeft') go(index - 1)
      }}
    >
      {/* ── Images ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index
          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={cn(
                'absolute inset-0 overflow-hidden transition-opacity duration-[1400ms] ease-out',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
            >
              {/* Keyed on active state so the push-in restarts on each visit. */}
              <div key={isActive ? `on-${index}` : 'off'} className={cn('absolute inset-0', isActive && 'animate-kenburns')}>
                <SmartImage
                  media={slide.media}
                  seed={slide.id}
                  alt=""
                  sizes="100vw"
                  priority={slideIndex === 0}
                  quality={82}
                />
              </div>
            </div>
          )
        })}

        {/* Legibility: weighted left where the copy sits, and to the bottom
            where the selector sits. */}
        <div className="absolute inset-0 bg-gradient-to-r from-plum-950/85 via-plum-950/45 to-plum-950/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-plum-950/90 via-plum-950/10 to-plum-950/40" />
      </div>

      {/* ── Copy ───────────────────────────────────────────────────────── */}
      <div className="container-page relative w-full pb-36 pt-32 sm:pb-40">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index
          const Heading = slideIndex === 0 ? 'h1' : 'h2'
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="diapositiva"
              aria-label={`${slideIndex + 1} de ${count}: ${slide.tabLabel}`}
              aria-hidden={!isActive}
              inert={!isActive}
              className={cn(
                'max-w-2xl',
                isActive ? 'relative' : 'pointer-events-none absolute inset-x-0 top-32 opacity-0',
              )}
            >
              {/* Keyed so the staggered entrance replays per slide. */}
              <div key={isActive ? `copy-${index}` : 'idle'}>
                <p
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/90 ring-1 ring-inset ring-white/20 backdrop-blur-md',
                    isActive && 'animate-rise-in',
                  )}
                >
                  <MapPin className="size-3" aria-hidden="true" />
                  {slide.eyebrow}
                </p>

                <Heading
                  className={cn(
                    'mt-5 font-display text-display-lg font-bold leading-[1.03] text-white',
                    isActive && 'animate-rise-in [animation-delay:120ms]',
                  )}
                >
                  {slide.title}
                </Heading>

                <p
                  className={cn(
                    'mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-[1.125rem]',
                    isActive && 'animate-rise-in [animation-delay:240ms]',
                  )}
                >
                  {slide.description}
                </p>

                <div
                  className={cn(
                    'mt-8 flex flex-col gap-3 sm:flex-row',
                    isActive && 'animate-rise-in [animation-delay:360ms]',
                  )}
                >
                  <ButtonLink href={slide.cta.href} size="lg" variant="accent" className="shadow-accent">
                    {slide.cta.label}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </ButtonLink>
                  {/* A second, different destination: when the slide already
                      points at the catalogue, offer the planning guide. */}
                  <ButtonLink
                    href={slide.cta.href === ROUTES.tours ? ROUTES.blogPost('que-hacer-en-el-calafate') : ROUTES.tours}
                    size="lg"
                    variant="glass"
                  >
                    {slide.cta.href === ROUTES.tours ? 'Qué hacer en El Calafate' : 'Todas las excursiones'}
                  </ButtonLink>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      {count > 1 ? (
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="container-page flex items-end gap-4 pb-14 sm:pb-16">
            <div className="flex flex-1 gap-2 sm:gap-3" role="tablist" aria-label="Elegir diapositiva">
              {slides.map((slide, slideIndex) => {
                const isActive = slideIndex === index
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Ir a ${slide.tabLabel}`}
                    onClick={() => go(slideIndex)}
                    className="group flex-1 text-left"
                  >
                    <span className="relative block h-[3px] overflow-hidden rounded-full bg-white/25">
                      {isActive ? (
                        <span
                          key={`${index}-${running}`}
                          className={cn(
                            'absolute inset-0 rounded-full bg-white',
                            running ? 'animate-progress' : 'scale-x-100',
                          )}
                          style={running ? { animationDuration: `${DWELL_MS}ms` } : undefined}
                        />
                      ) : slideIndex < index ? (
                        <span className="absolute inset-0 rounded-full bg-white/60" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'mt-2.5 hidden text-[0.75rem] font-semibold tracking-wide transition-colors sm:block',
                        isActive ? 'text-white' : 'text-white/55 group-hover:text-white/85',
                      )}
                    >
                      {slide.tabLabel}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <SliderButton label={paused ? 'Reanudar' : 'Pausar'} onClick={() => setPaused((p) => !p)}>
                {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              </SliderButton>
              <SliderButton label="Anterior" onClick={() => go(index - 1)}>
                <ChevronLeft className="size-5" aria-hidden="true" />
              </SliderButton>
              <SliderButton label="Siguiente" onClick={() => go(index + 1)}>
                <ChevronRight className="size-5" aria-hidden="true" />
              </SliderButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* The licence credit follows whichever photograph is on screen. */}
      <PhotoCredit
        media={active.media}
        tone="light"
        // Top-right: the bottom edge is overlapped by the search card.
        className="absolute right-5 top-[5.25rem] z-10 text-right sm:right-8"
      />

      <p className="sr-only" aria-live="polite">
        {`Diapositiva ${index + 1} de ${count}: ${active.title}`}
      </p>
    </section>
  )
}

function SliderButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25"
    >
      {children}
    </button>
  )
}
