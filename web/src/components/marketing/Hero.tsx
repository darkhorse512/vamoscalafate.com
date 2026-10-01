import { ArrowRight, MapPin } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { ButtonLink } from '@/components/ui/Button'
import { SmartImage } from '@/components/media/SmartImage'
import type { MediaRef } from '@vamos/types'
import { HeroScene } from './HeroScene'

/**
 * Homepage hero.
 *
 * When no hero photograph has been uploaded yet, this falls back to a drawn
 * Patagonian scene rather than stock imagery - presenting a generic photo as
 * El Calafate would misrepresent the destination. Replace `media` with a real
 * image as soon as one exists; the composition is designed to take one.
 *
 * The heading is a real <h1> rendered server-side, so the LCP element is text
 * that paints immediately rather than waiting on an image decode.
 */
export function Hero({
  media,
  title,
  subtitle,
}: {
  media?: MediaRef | null
  title: string
  subtitle: string
}) {
  return (
    <section className="relative isolate flex min-h-[min(88svh,46rem)] items-end overflow-hidden bg-inverse">
      <div className="absolute inset-0 -z-10">
        {media?.url ? (
          <SmartImage
            media={media}
            seed="hero"
            alt="Paisaje de El Calafate, Patagonia argentina"
            sizes="100vw"
            priority
            quality={82}
            className="hero-drift"
          />
        ) : (
          <HeroScene />
        )}
        <div className={media?.url ? 'absolute inset-0 scrim-full' : 'absolute inset-0 scrim-hero'} />
      </div>

      <div className="container-page relative pb-14 pt-32 sm:pb-20">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-white/85 ring-1 ring-inset ring-white/20 backdrop-blur-sm">
          <MapPin className="size-3" aria-hidden="true" />
          El Calafate · Santa Cruz · Argentina
        </p>

        <h1 className="mt-5 max-w-3xl font-display text-display-lg font-bold leading-[1.05] text-white">
          {title}
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-[1.0625rem]">
          {subtitle}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={ROUTES.tours} size="lg" variant="accent">
            Ver excursiones
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>

          <ButtonLink
            href={ROUTES.blogPost('que-hacer-en-el-calafate')}
            size="lg"
            variant="glass"
          >
            Qué hacer en El Calafate
          </ButtonLink>
        </div>

        <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/15 pt-6 text-[0.8125rem] text-white/75">
          <HeroFact label="Glaciar Perito Moreno" detail="a 80 km por la Ruta 11" />
          <HeroFact label="Aeropuerto FTE" detail="a 23 km del centro" />
          <HeroFact label="Parque Nacional" detail="Patrimonio UNESCO desde 1981" />
        </ul>
      </div>
    </section>
  )
}

function HeroFact({ label, detail }: { label: string; detail: string }) {
  return (
    <li className="flex flex-col">
      <span className="font-semibold text-white">{label}</span>
      <span className="text-white/60">{detail}</span>
    </li>
  )
}
