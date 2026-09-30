import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Consistent section header. `eyebrow` carries the category label and the
 * heading level is explicit, so page structure stays correct for screen
 * readers rather than being chosen for visual size.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  link,
  align = 'left',
  as: Tag = 'h2',
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  link?: { href: string; label: string }
  align?: 'left' | 'center'
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
        {eyebrow ? (
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.13em] text-glacier-700">
            {eyebrow}
          </p>
        ) : null}
        <Tag className="text-[1.75rem] leading-[1.15] sm:text-[2.125rem]">{title}</Tag>
        {description ? (
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-lenga-600">{description}</p>
        ) : null}
      </div>

      {link ? (
        <Link
          href={link.href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-glacier-700 transition-colors hover:text-glacier-900"
        >
          {link.label}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      ) : null}
    </div>
  )
}
