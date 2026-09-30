import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Wordmark. A drawn mark rather than an image file: it stays crisp at any
 * size, costs no extra request, and needs no asset pipeline.
 */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="Vamos Calafate — inicio"
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-[0.3rem] transition-colors',
          tone === 'light' ? 'bg-white/15 ring-1 ring-white/25' : 'bg-lenga-950',
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none">
          {/* Stylised glacier front over water */}
          <path d="M2 16.5 L7 8 L11 13 L15.5 5.5 L22 16.5 Z" fill={tone === 'light' ? '#ffffff' : '#8dc3d8'} />
          <path d="M2 17.5 h20 v1.6 H2 Z" fill={tone === 'light' ? '#ffffff' : '#3585a7'} opacity="0.85" />
          <path d="M4 20.2 h16 v1.1 H4 Z" fill={tone === 'light' ? '#ffffff' : '#3585a7'} opacity="0.5" />
        </svg>
      </span>

      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-[1.0625rem] font-bold tracking-tight',
            tone === 'light' ? 'text-white' : 'text-lenga-950',
          )}
        >
          Vamos Calafate
        </span>
        <span
          className={cn(
            'mt-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.16em]',
            tone === 'light' ? 'text-white/65' : 'text-lenga-500',
          )}
        >
          Patagonia Argentina
        </span>
      </span>
    </Link>
  )
}
