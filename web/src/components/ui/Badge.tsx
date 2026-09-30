import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'glacier' | 'lenga' | 'ochre' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-lenga-700 ring-stone-200',
  glacier: 'bg-glacier-50 text-glacier-800 ring-glacier-200',
  lenga: 'bg-lenga-50 text-lenga-800 ring-lenga-200',
  ochre: 'bg-[#fdf6e8] text-ochre-600 ring-[#f0e0bd]',
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
