import { ArrowRight, MapPin } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { ButtonLink } from '@/components/ui/Button'
import { SmartImage } from '@/components/media/SmartImage'
import type { MediaRef } from '@vamos/types'
import { cn } from '@/lib/utils'

/**
 * Homepage hero.
 *
 * When no hero photograph has been uploaded yet, this falls back to a drawn
 * Patagonian scene rather than stock imagery — presenting a generic photo as
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
    <section className="relative isolate flex min-h-[min(88svh,46rem)] items-end overflow-hidden bg-lenga-950">
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
          <DrawnPatagonia />
        )}
        <div className="absolute inset-0 scrim-full" />
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
            className="border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            variant="ghost"
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

/**
 * Fallback scene: layered ridgelines and a glacier front, drawn in SVG.
 * Weighs under 2 KB, scales to any viewport and needs no image request.
 */
function DrawnPatagonia({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 bg-lenga-950', className)}>
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#244a5f" />
            <stop offset="45%" stopColor="#2a6c8c" />
            <stop offset="100%" stopColor="#56a2c1" />
          </linearGradient>
          <linearGradient id="hero-ice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dcedf4" />
            <stop offset="100%" stopColor="#8dc3d8" />
          </linearGradient>
          <linearGradient id="hero-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3585a7" />
            <stop offset="100%" stopColor="#1b3f52" />
          </linearGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#hero-sky)" />

        {/* Distant cordillera */}
        <path
          d="M0 430 L150 330 L260 400 L400 275 L520 385 L660 300 L820 395 L960 310 L1120 400 L1280 330 L1440 415 L1440 900 L0 900 Z"
          fill="#244a5f"
          opacity="0.55"
        />

        {/* Mid range */}
        <path
          d="M0 505 L190 425 L340 495 L500 405 L680 490 L860 420 L1040 500 L1230 430 L1440 505 L1440 900 L0 900 Z"
          fill="#223f51"
          opacity="0.8"
        />

        {/* Glacier front */}
        <path
          d="M280 600 L320 545 L360 585 L410 530 L455 580 L505 540 L560 590 L620 545 L680 595 L740 550 L800 600 L860 555 L920 605 L980 560 L1040 610 L1040 665 L280 665 Z"
          fill="url(#hero-ice)"
        />
        <path
          d="M280 600 L320 545 L360 585 L410 530 L455 580 L505 540 L560 590 L620 545 L680 595 L740 550 L800 600 L860 555 L920 605 L980 560 L1040 610"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Lake */}
        <rect y="665" width="1440" height="235" fill="url(#hero-water)" />

        {/* Floating ice */}
        <ellipse cx="200" cy="715" rx="48" ry="9" fill="#dcedf4" opacity="0.6" />
        <ellipse cx="1180" cy="748" rx="66" ry="11" fill="#dcedf4" opacity="0.45" />
        <ellipse cx="620" cy="790" rx="38" ry="7" fill="#dcedf4" opacity="0.35" />

        {/* Steppe foreground */}
        <path d="M0 830 Q360 800 720 828 T1440 812 L1440 900 L0 900 Z" fill="#10221f" />
      </svg>
    </div>
  )
}
