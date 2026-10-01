import type { MediaRef } from '@vamos/types'
import { SmartImage } from '@/components/media/SmartImage'
import { PhotoCredit } from '@/components/media/PhotoCredit'
import { Highlight } from './Highlight'

/**
 * Full-bleed image banner carrying the region's defining figures.
 *
 * The figures are edited in the homepage editor. They should describe the
 * place (published reference figures), never the company — no invented
 * booking counts or ratings.
 */
export function FactsBanner({
  media,
  eyebrow,
  title,
  items,
}: {
  media: MediaRef | null
  eyebrow: string
  title: string
  items: { value: string; label: string }[]
}) {
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
            {eyebrow}
          </p>
          <h2 className="mt-4 font-display text-display-md font-bold leading-[1.08] text-white">
            <Highlight text={title} />
          </h2>
        </div>

        <dl
          className={`mt-14 grid gap-px overflow-hidden rounded-card bg-white/15 ring-1 ring-white/15 backdrop-blur-md sm:grid-cols-2 ${
            items.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
          }`}
        >
          {items.map((fact) => (
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
