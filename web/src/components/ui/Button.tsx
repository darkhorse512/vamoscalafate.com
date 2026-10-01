import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Button and ButtonLink share one visual definition.
 *
 * `ButtonLink` renders an anchor for navigation and `Button` a real <button>
 * for actions - never a div with a click handler, which would be invisible to
 * keyboard and assistive technology.
 */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'glass'
type Size = 'sm' | 'md' | 'lg'

// Pill-shaped with a slight lift on hover: the press feels physical without
// any layout shift, since only `transform` moves.
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold ' +
  'transition-all duration-200 hover:-translate-y-px active:translate-y-0 ' +
  'disabled:pointer-events-none disabled:opacity-55 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-violet-700 text-white shadow-[0_6px_18px_rgb(90_62_240/0.28)] ' +
    'hover:from-violet-700 hover:to-violet-800 hover:shadow-[0_10px_24px_rgb(90_62_240/0.36)] focus-visible:ring-primary',
  secondary:
    'bg-plum-900 text-white hover:bg-inverse active:bg-black focus-visible:ring-plum-700',
  outline:
    'border border-border-strong bg-surface text-heading hover:border-primary hover:bg-surface-muted focus-visible:ring-primary',
  ghost: 'text-foreground hover:bg-surface-strong focus-visible:ring-primary',
  // Frosted, for use over photographs and dark bands. A variant of its own
  // because `cn` does not merge: overriding `ghost` left its surface-coloured
  // hover in the cascade, racing the override.
  glass:
    'border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 focus-visible:ring-white/70',
  accent:
    'bg-gradient-to-r from-magenta-500 to-magenta-600 text-white shadow-accent ' +
    'hover:from-magenta-600 hover:to-magenta-700 hover:shadow-[0_10px_26px_rgb(255_46_112/0.4)] focus-visible:ring-magenta-500',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.8125rem]',
  // 44px - the minimum comfortable touch target on mobile.
  md: 'h-11 px-5 text-sm',
  lg: 'h-[3.25rem] px-7 text-[0.9375rem]',
}

function classes(variant: Variant, size: Size, fullWidth?: boolean, className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size; fullWidth?: boolean }) {
  return (
    <button className={classes(variant, size, fullWidth, className)} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  href,
  children,
  external,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  external?: boolean
  children: ReactNode
}) {
  const cls = classes(variant, size, fullWidth, className)

  if (external) {
    return (
      <a
        href={href}
        className={cls}
        // noopener closes the window.opener hole; noreferrer also strips the
        // Referer header when leaving the site.
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={cls} {...props}>
      {children}
    </Link>
  )
}
