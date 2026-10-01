import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger'

/**
 * Every tone resolves through semantic tokens, so badges stay legible when
 * the theme inverts. The previous palette was hardcoded hex — a pale tint
 * with dark text, which on a dark background becomes a near-white pill with
 * light text on it, i.e. unreadable.
 */
const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-strong text-foreground ring-border',
  primary: 'bg-primary-soft text-primary ring-primary/30',
  accent: 'bg-accent-soft text-accent ring-accent/30',
  success: 'bg-success-soft text-success ring-success/30',
  warning: 'bg-warning-soft text-warning ring-warning/30',
  danger: 'bg-danger-soft text-danger ring-danger/30',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
