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

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent'
type Size = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold ' +
  'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-violet-700 text-white hover:bg-violet-800 active:bg-violet-900 focus-visible:ring-violet-600',
  secondary:
    'bg-plum-900 text-white hover:bg-inverse active:bg-black focus-visible:ring-plum-700',
  outline:
    'border border-border-strong bg-surface text-heading hover:border-plum-400 hover:bg-surface-muted focus-visible:ring-violet-600',
  ghost: 'text-foreground hover:bg-surface-strong focus-visible:ring-violet-600',
  accent:
    'bg-magenta-500 text-white hover:bg-magenta-600 active:bg-magenta-600 focus-visible:ring-magenta-500',
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
