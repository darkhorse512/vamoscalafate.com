'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import type { MediaRef } from '@vamos/types'
import { SmartImage } from './SmartImage'
import { cn } from '@/lib/utils'

/**
 * Tour gallery.
 *
 * A mosaic on desktop and a swipeable rail on mobile. The lightbox is a proper
 * dialog: Escape closes it, arrow keys navigate, background scroll is locked
 * and focus is returned to the trigger on close.
 *
 * The first image is `priority` — on a tour page it is the LCP element, and
 * lazy-loading it would delay the largest paint by a full round-trip.
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

  // Always render a hero area, even with no uploaded images, so the page does
  // not collapse into a text wall before photography exists.
  const slots = images.length > 0 ? images : [null, null, null]

  const close = useCallback(() => setLightboxIndex(null), [])

  const step = useCallback(
    (delta: number) => {
      setLightboxIndex((current) => {
        if (current === null) return null
        return (current + delta + images.length) % images.length
      })
    },
    [images.length],
  )

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

  const openable = images.length > 0

  return (
    <>
      {/* Mobile: horizontal rail */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 no-scrollbar sm:hidden">
        {slots.map((media, index) => (
          <button
            key={index}
            type="button"
            disabled={!openable}
            onClick={() => openable && setLightboxIndex(index)}
            aria-label={openable ? `Ampliar imagen ${index + 1} de ${images.length}` : undefined}
            className="relative aspect-[4/3] w-[86vw] shrink-0 snap-center overflow-hidden rounded-card bg-stone-100"
          >
            <SmartImage
              media={media}
              seed={`${seed}-${index}`}
              alt={`${title} — imagen ${index + 1}`}
              sizes="86vw"
              priority={index === 0}
            />
          </button>
        ))}
      </div>

      {/* Desktop: mosaic */}
      <div className="hidden gap-2 sm:grid sm:grid-cols-4 sm:grid-rows-2">
        {slots.slice(0, 5).map((media, index) => (
          <button
            key={index}
            type="button"
            disabled={!openable}
            onClick={() => openable && setLightboxIndex(index)}
            aria-label={openable ? `Ampliar imagen ${index + 1} de ${images.length}` : undefined}
            className={cn(
              'group relative overflow-hidden bg-stone-100',
              index === 0
                ? 'col-span-2 row-span-2 aspect-[4/3] rounded-l-card'
                : 'aspect-[4/3]',
              index === 1 && 'rounded-tr-none',
              index === 2 && 'rounded-tr-card',
              index === 4 && 'rounded-br-card',
            )}
          >
            <SmartImage
              media={media}
              seed={`${seed}-${index}`}
              alt={`${title} — imagen ${index + 1}`}
              sizes={index === 0 ? '(max-width: 1023px) 50vw, 40vw' : '20vw'}
              priority={index === 0}
              className="transition-transform duration-500 group-hover:scale-[1.04]"
            />

            {index === 4 && images.length > 5 ? (
              <span className="absolute inset-0 grid place-items-center bg-lenga-950/55 text-sm font-semibold text-white">
                <span className="inline-flex items-center gap-1.5">
                  <Expand className="size-4" aria-hidden="true" />+{images.length - 5} fotos
                </span>
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — imagen ${lightboxIndex + 1} de ${images.length}`}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-lenga-950/95 p-4"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar galería"
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Imagen anterior"
                className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Imagen siguiente"
                className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </>
          ) : null}

          <div className="relative max-h-[85vh] w-full max-w-5xl">
            <div className="relative aspect-[3/2]">
              <SmartImage
                media={images[lightboxIndex]}
                seed={`${seed}-lightbox`}
                alt={`${title} — imagen ${lightboxIndex + 1}`}
                sizes="(max-width: 1023px) 100vw, 1024px"
                quality={88}
                className="object-contain"
              />
            </div>

            {images[lightboxIndex]?.caption ? (
              <p className="mt-3 text-center text-sm text-white/75">
                {images[lightboxIndex]?.caption}
              </p>
            ) : null}

            <p className="mt-1.5 text-center text-xs text-white/50">
              {lightboxIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
