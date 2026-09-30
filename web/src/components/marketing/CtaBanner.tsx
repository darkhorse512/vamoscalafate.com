import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'

/** Closing call to action. One primary path, one secondary - never a wall. */
export function CtaBanner({
  eyebrow,
  title,
  description,
  primary,
  secondary,
}: {
  eyebrow?: string
  title: string
  description: string
  primary: { href: string; label: string }
  secondary?: { href: string; label: string }
}) {
  return (
    <section className="relative isolate overflow-hidden bg-lenga-950">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 80% at 15% 0%, #255872 0%, transparent 60%), radial-gradient(ellipse 50% 70% at 90% 100%, #2b5145 0%, transparent 55%)',
        }}
      />

      <div className="container-page py-16 text-center sm:py-20">
        {eyebrow ? (
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-glacier-300">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mx-auto mt-3 max-w-2xl font-display text-display-sm font-bold leading-tight text-white">
          {title}
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-stone-300">
          {description}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href={primary.href} size="lg" variant="accent">
            {primary.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>

          {secondary ? (
            <ButtonLink
              href={secondary.href}
              size="lg"
              variant="ghost"
              className="border border-white/25 text-white hover:bg-white/10"
            >
              {secondary.label}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  )
}
