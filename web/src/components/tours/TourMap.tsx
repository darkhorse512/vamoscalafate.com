'use client'

import { useState } from 'react'
import { Hand, MapPinned } from 'lucide-react'

/**
 * Route map (Google My Maps embed).
 *
 * A map that captures the scroll wheel traps visitors: they scroll down the
 * page, the cursor passes over the map, and suddenly they are zooming instead
 * of scrolling. My Maps embeds cannot turn that off, so the map stays inert
 * behind a transparent shield until it is clicked or tapped — after which it
 * zooms with its own + / − controls and drag, as normal. Leaving the map
 * re-arms the shield.
 *
 * The iframe loads lazily: it is far down the page and heavy.
 */
export function TourMap({ src, title }: { src: string; title: string }) {
  const [active, setActive] = useState(false)

  return (
    <div
      className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface-strong shadow-raised sm:aspect-[16/9]"
      onMouseLeave={() => setActive(false)}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 size-full border-0"
      />

      {!active ? (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 flex items-end justify-center bg-transparent p-4 focus-visible:outline-none"
          aria-label={`Activar el mapa: ${title}`}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-plum-950/85 px-4 py-2 text-xs font-semibold text-white shadow-float backdrop-blur-md transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-white">
            <Hand className="size-3.5" aria-hidden="true" />
            Hacé clic para usar el mapa
          </span>
        </button>
      ) : (
        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-3 py-1 text-[0.6875rem] font-semibold text-heading shadow-subtle">
          <MapPinned className="size-3.5 text-primary" aria-hidden="true" />
          Usá + y − para el zoom
        </span>
      )}
    </div>
  )
}
