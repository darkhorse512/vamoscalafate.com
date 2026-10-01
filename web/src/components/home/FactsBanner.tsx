import type { MediaRef } from '@vamos/types'
import { SmartImage } from '@/components/media/SmartImage'
import { PhotoCredit } from '@/components/media/PhotoCredit'

/**
 * Full-bleed image banner carrying the region's defining figures.
 *
 * These are published reference figures for Los Glaciares, rounded and
 * marked approximate where the sources themselves vary. They describe the
 * place, never the company — no invented booking counts or ratings.
 */
const FACTS = [
  { value: '1981', label: 'Patrimonio de la Humanidad por la UNESCO' },
  { value: '≈ 5 km', label: 'de ancho tiene el frente del Perito Moreno' },
  { value: '≈ 60 m', label: 'de altura sobre el agua alcanzan sus paredes' },
  { value: '+1.400 km²', label: 'de superficie tiene el Lago Argentino, el mayor del país' },
]

export function FactsBanner({ media }: { media: MediaRef | null }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <SmartImage media={media} seed="facts-banner" alt="" sizes="100vw" quality={80} />
        <div className="absolute inset-0 bg-plum-950/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-plum-950/80 via-transparent to-violet-950/60" />
      </div>

      <div className="container-page py-20 sm:py-28">
        <div className="reveal max-w-2xl">
          <p className="inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-violet-300">
            <span className="accent-rule" aria-hidden="true" />
            Parque Nacional Los Glaciares
          </p>
          <h2 className="mt-4 font-display text-display-md font-bold leading-[1.08] text-white">
            Uno de los paisajes de hielo <span className="text-gradient">más impresionantes</span> del planeta
          </h2>
        </div>

        <dl className="mt-14 grid gap-px overflow-hidden rounded-card bg-white/15 ring-1 ring-white/15 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="reveal flex flex-col bg-plum-950/40 p-6 sm:p-7">
              <dt className="order-2 mt-2 text-[0.8125rem] leading-snug text-white/70">{fact.label}</dt>
              <dd className="font-display text-[2.25rem] font-bold leading-none text-white sm:text-[2.75rem]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <PhotoCredit media={media} tone="light" className="absolute bottom-3 right-5 text-right" />
    </section>
  )
}
