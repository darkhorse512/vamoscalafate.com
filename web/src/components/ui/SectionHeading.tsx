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
  tone = 'default',
  className,
}: {
  /** `light` sets the heading on a photograph or dark band. */
  tone?: 'default' | 'light'
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
          <p
            className={cn(
              'mb-3 inline-flex items-center gap-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.16em]',
              tone === 'light' ? 'text-violet-300' : 'text-primary',
              align === 'center' && 'justify-center',
            )}
          >
            <span className="accent-rule" aria-hidden="true" />
            {eyebrow}
          </p>
        ) : null}
        <Tag
          className={cn(
            'text-[1.875rem] leading-[1.12] sm:text-[2.5rem]',
            tone === 'light' && 'text-white',
            Tag === 'h1' && 'sm:text-[3rem]',
          )}
        >
          {title}
        </Tag>
        {description ? (
          <p
            className={cn(
              'mt-3 text-[0.9375rem] leading-relaxed sm:text-base',
              tone === 'light' ? 'text-white/75' : 'text-muted-foreground',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {link ? (
        <Link
          href={link.href}
          className={cn(
            'group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition-colors',
            tone === 'light'
              ? 'rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-inset ring-white/25 backdrop-blur-md hover:bg-white/20'
              : 'text-primary hover:text-primary-hover',
          )}
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
