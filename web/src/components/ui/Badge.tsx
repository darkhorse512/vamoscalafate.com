import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'glacier' | 'lenga' | 'ochre' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-strong text-foreground ring-border',
  glacier: 'bg-violet-50 text-violet-800 ring-violet-200',
  lenga: 'bg-plum-50 text-foreground ring-plum-200',
  ochre: 'bg-[#fdf6e8] text-magenta-600 ring-[#f0e0bd]',
  success: 'bg-[#edf5f0] text-[#2f6f4f] ring-[#c9e2d4]',
  warning: 'bg-[#fbf4e6] text-[#8a6014] ring-[#eddfc0]',
  danger: 'bg-[#fbeeee] text-[#9b3232] ring-[#f0d2d2]',
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
