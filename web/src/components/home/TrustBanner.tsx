import { ArrowRight, Briefcase, Check, Users } from 'lucide-react'
import type { MediaRef } from '@vamos/types'
import { SmartImage } from '@/components/media/SmartImage'
import { ButtonLink } from '@/components/ui/Button'

/**
 * Experience, and the two audiences that need a different door.
 *
 * The years count is the single number a visitor weighs when deciding whether
 * to hand over a card, so it is set as a display figure rather than buried in
 * a paragraph. Everything beside it is checkable - who operates, how a
 * reservation is confirmed, what the price includes - because an unverifiable
 * claim next to a verifiable one devalues both.
 *
 * The two buttons lead to enquiry pages, not to an advertised discount. What a
 * group or an agency pays is the operator's to quote, case by case.
 */
export function TrustBanner({
  content,
  media,
}: {
  content: {
    eyebrow: string
    title: string
    description: string
    yearsValue: string
    yearsLabel: string
    points: { title: string; description: string }[]
    agencies: { label: string; href: string }
    groups: { label: string; href: string }
  }
  media: MediaRef | null
}) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-16">
      <div>
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-accent">
          {content.eyebrow}
        </p>

        <div className="mt-5 flex items-start gap-5">
          {content.yearsValue ? (
            <p className="shrink-0 font-display text-[4rem] font-bold leading-[0.85] text-gradient sm:text-[5rem]">
              {content.yearsValue}
            </p>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-[1.75rem] font-semibold leading-tight text-heading sm:text-[2.125rem]">
              {content.title}
            </h2>
            {content.yearsLabel ? (
              <p className="mt-2 text-sm font-semibold text-primary">{content.yearsLabel}</p>
            ) : null}
          </div>
        </div>

        {content.description ? (
          <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
            {content.description}
          </p>
        ) : null}

        {content.points.length > 0 ? (
          <ul className="mt-7 grid gap-4 sm:grid-cols-2">
            {content.points.map((point) => (
              <li key={point.title} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success"
                  aria-hidden="true"
                >
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-heading">{point.title}</span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {point.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {content.agencies.label ? (
            <ButtonLink href={content.agencies.href} variant="primary">
              <Briefcase className="size-4" aria-hidden="true" />
              {content.agencies.label}
            </ButtonLink>
          ) : null}
          {content.groups.label ? (
            <ButtonLink href={content.groups.href} variant="outline">
              <Users className="size-4" aria-hidden="true" />
              {content.groups.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {media ? (
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] shadow-float lg:aspect-[4/4.4]">
          <SmartImage
            media={media}
            alt=""
            seed="trust"
            sizes="(min-width: 1024px) 28rem, 90vw"
            className="object-cover"
          />
        </div>
      ) : null}
    </div>
  )
}
