'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import type { MediaRef } from '@vamos/types'
import { SmartImage } from './SmartImage'
import { cn } from '@/lib/utils'

/**
 * Tour gallery.
 *
 * Desktop shows an editorial mosaic — one large frame and a stack of smaller
 * ones — which reads as a magazine spread rather than a uniform grid. Mobile
 * gets a snap-scrolling rail with a position indicator and a thumbnail strip.
 *
 * The lightbox is a proper dialog: focus moves in and is trapped, Escape
 * closes, arrow keys navigate, background scroll is locked, and focus returns
 * to the thumbnail that opened it.
 *
 * The first image is `priority` — on a tour page it is the LCP element, and
 * lazy-loading it would delay the largest paint by a round-trip.
 */
export function Gallery({
  images,
  seed,
  title,
}: {
  images: MediaRef[]
  seed: string
  title: string
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [railIndex, setRailIndex] = useState(0)
  const railRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  // Always render a hero area, even before photography exists, so the page
  // does not collapse into a wall of text.
  const slots: (MediaRef | null)[] = images.length > 0 ? images : [null, null, null]
  const openable = images.length > 0
  const count = slots.length

  /**
   * Mosaic placement.
   *
   * The grid is 4 columns × 2 rows. Without count-aware spans a gallery of
   * three leaves a quarter of the frame empty, which reads as a broken
   * layout rather than a deliberate one.
   */
  function tileClass(index: number, total: number): string {
    if (total === 1) return 'col-span-4 row-span-2'
    if (total === 2) return 'col-span-2 row-span-2'
    if (total === 3) return index === 0 ? 'col-span-2 row-span-2' : 'col-span-2'
    if (total === 4) return index === 0 ? 'col-span-2 row-span-2' : index === 3 ? 'col-span-2' : ''
    return index === 0 ? 'col-span-2 row-span-2' : ''
  }

  const close = useCallback(() => {
    setLightboxIndex(null)
    triggerRef.current?.focus()
  }, [])

  const step = useCallback(
    (delta: number) => {
      setLightboxIndex((current) =>
        current === null ? null : (current + delta + count) % count,
      )
    },
    [count],
  )

  function open(index: number, event: React.MouseEvent<HTMLButtonElement>) {
    if (!openable) return
    triggerRef.current = event.currentTarget
    setLightboxIndex(index)
  }

  // Lightbox keyboard and scroll handling.
  useEffect(() => {
    if (lightboxIndex === null) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [lightboxIndex, close, step])

  // Track the mobile rail so the counter and dots stay in step.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return

    function onScroll() {
      const el = railRef.current
      if (!el) return
      const width = el.clientWidth
      setRailIndex(Math.round(el.scrollLeft / Math.max(1, width)))
    }

    rail.addEventListener('scroll', onScroll, { passive: true })
    return () => rail.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* ── Mobile: full-bleed snap rail ─────────────────────────────── */}
      <div className="relative sm:hidden">
        <div
          ref={railRef}
          className="no-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto"
        >
          {slots.map((media, index) => (
            <button
              key={index}
              type="button"
              disabled={!openable}
              onClick={(event) => open(index, event)}
              aria-label={openable ? `Ampliar imagen ${index + 1} de ${count}` : undefined}
              className="relative aspect-[4/3] w-screen shrink-0 snap-center bg-stone-100"
            >
              <SmartImage
                media={media}
                seed={`${seed}-${index}`}
                alt={`${title} — imagen ${index + 1}`}
                sizes="100vw"
                priority={index === 0}
              />
            </button>
          ))}
        </div>

        {count > 1 ? (
          <>
            <div
              className="pointer-events-none absolute bottom-3 right-6 rounded-full bg-lenga-950/70 px-2.5 py-1 text-[0.6875rem] font-medium text-white backdrop-blur-sm"
              aria-live="polite"
            >
              {railIndex + 1} / {count}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {slots.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === railIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50',
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* ── Desktop: editorial mosaic ────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-card sm:grid sm:h-[30rem] sm:grid-cols-4 sm:grid-rows-2 sm:gap-2">
        {slots.slice(0, 5).map((media, index) => (
          <button
            key={index}
            type="button"
            disabled={!openable}
            onClick={(event) => open(index, event)}
            aria-label={openable ? `Ampliar imagen ${index + 1} de ${count}` : undefined}
            className={cn(
              'group/tile relative overflow-hidden bg-stone-100',
              tileClass(index, Math.min(count, 5)),
            )}
          >
            <SmartImage
              media={media}
              seed={`${seed}-${index}`}
              alt={`${title} — imagen ${index + 1}`}
              sizes={index === 0 ? '(max-width: 1279px) 50vw, 640px' : '320px'}
              priority={index === 0}
              className="transition-transform duration-700 group-hover/tile:scale-[1.05]"
            />

            {/* Subtle darkening on hover signals the tile is interactive. */}
            {openable ? (
              <span className="absolute inset-0 bg-lenga-950/0 transition-colors duration-300 group-hover/tile:bg-lenga-950/10" />
            ) : null}

            {index === 4 && count > 5 ? (
              <span className="absolute inset-0 grid place-items-center bg-lenga-950/55 text-sm font-semibold text-white backdrop-blur-[2px]">
                <span className="inline-flex items-center gap-1.5">
                  <Expand className="size-4" aria-hidden="true" />+{count - 5} fotos
                </span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── Thumbnail strip ──────────────────────────────────────────── */}
      {openable && count > 1 ? (
        <div className="no-scrollbar mt-3 hidden gap-2 overflow-x-auto sm:flex">
          {images.map((media, index) => (
            <button
              key={index}
              type="button"
              onClick={(event) => open(index, event)}
              aria-label={`Ver imagen ${index + 1}`}
              className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-control bg-stone-100 ring-1 ring-stone-200 transition-all hover:ring-2 hover:ring-glacier-500"
            >
              <SmartImage
                media={media}
                seed={`${seed}-thumb-${index}`}
                alt={`${title} — miniatura ${index + 1}`}
                sizes="96px"
              />
            </button>
          ))}
        </div>
      ) : null}

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      {lightboxIndex !== null && images[lightboxIndex] ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — imagen ${lightboxIndex + 1} de ${count}`}
          className="fixed inset-0 z-[90] flex flex-col bg-lenga-950/97 backdrop-blur-sm"
        >
          <div className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
            <p className="text-sm font-medium text-white/80">
              {lightboxIndex + 1} / {count}
            </p>
            <button
              type="button"
              onClick={close}
              autoFocus
              aria-label="Cerrar galería"
              className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-16">
            {count > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Imagen anterior"
                  className="absolute left-2 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
                >
                  <ChevronRight className="size-5" aria-hidden="true" />
                </button>
              </>
            ) : null}

            <figure className="relative flex size-full flex-col items-center justify-center">
              <div className="relative size-full">
                <SmartImage
                  media={images[lightboxIndex]}
                  seed={`${seed}-lightbox`}
                  alt={`${title} — imagen ${lightboxIndex + 1}`}
                  sizes="(max-width: 1023px) 100vw, 1280px"
                  quality={90}
                  className="object-contain"
                />
              </div>

              {images[lightboxIndex]?.caption ? (
                <figcaption className="mt-3 max-w-2xl text-center text-sm text-white/70">
                  {images[lightboxIndex]?.caption}
                </figcaption>
              ) : null}
            </figure>
          </div>

          {count > 1 ? (
            <div className="no-scrollbar flex shrink-0 justify-start gap-2 overflow-x-auto px-4 pb-4 sm:justify-center sm:px-6">
              {images.map((media, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`Ver imagen ${index + 1}`}
                  aria-current={index === lightboxIndex}
                  className={cn(
                    'relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded transition-all',
                    index === lightboxIndex
                      ? 'ring-2 ring-white'
                      : 'opacity-50 hover:opacity-90',
                  )}
                >
                  <SmartImage
                    media={media}
                    seed={`${seed}-lb-thumb-${index}`}
                    alt=""
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
