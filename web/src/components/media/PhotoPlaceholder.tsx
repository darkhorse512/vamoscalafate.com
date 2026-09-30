import { cn } from '@/lib/utils'

/**
 * Deterministic placeholder for entities that have no photograph yet.
 *
 * The platform ships with no stock photography on purpose: presenting generic
 * images as El Calafate would misrepresent what a traveller is buying. Until
 * an operator uploads real photos, this renders a designed abstract landscape
 * instead of a broken image or an empty grey box.
 *
 * The composition is derived from a hash of the seed string, so a given tour
 * always gets the same placeholder — stable across renders and deploys.
 */

const PALETTES = [
  { sky: '#bcdce9', mid: '#56a2c1', deep: '#255872', land: '#21372f' },
  { sky: '#dcedf4', mid: '#8dc3d8', deep: '#2a6c8c', land: '#254238' },
  { sky: '#e9e4da', mid: '#90bba8', deep: '#336453', land: '#21372f' },
  { sky: '#d8d0c1', mid: '#a5947c', deep: '#615347', land: '#2a241f' },
  { sky: '#dcebe3', mid: '#639a84', deep: '#2b5145', land: '#10221f' },
]

function hash(seed: string): number {
  let value = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i)
    value = Math.imul(value, 16777619)
  }
  return Math.abs(value)
}

export function PhotoPlaceholder({
  seed,
  className,
  label,
}: {
  seed: string
  className?: string
  /** Rendered as visible text when there is room, e.g. on a hero. */
  label?: string
}) {
  const h = hash(seed)
  const palette = PALETTES[h % PALETTES.length]!

  // Two ridgelines, offset by the hash so silhouettes differ between entities.
  const ridgeA = 55 + (h % 13)
  const ridgeB = 68 + ((h >> 4) % 11)
  const peak = 18 + ((h >> 8) % 22)

  return (
    <div
      className={cn('relative isolate overflow-hidden bg-stone-100', className)}
      // Decorative: the surrounding card already carries the accessible name.
      role="presentation"
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-${h}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.sky} />
            <stop offset="100%" stopColor={palette.mid} stopOpacity="0.75" />
          </linearGradient>
        </defs>

        <rect width="400" height="300" fill={`url(#sky-${h})`} />

        {/* Far ridge */}
        <path
          d={`M0 ${ridgeA} L${peak * 3} ${ridgeA - 26} L${peak * 5} ${ridgeA - 8} L${200 + peak} ${ridgeA - 32} L320 ${ridgeA - 12} L400 ${ridgeA - 22} L400 300 L0 300 Z`}
          fill={palette.deep}
          opacity="0.35"
        />

        {/* Near ridge */}
        <path
          d={`M0 ${ridgeB} L70 ${ridgeB - 16} L${120 + peak} ${ridgeB + 4} L${230 - peak} ${ridgeB - 20} L300 ${ridgeB - 2} L400 ${ridgeB - 14} L400 300 L0 300 Z`}
          fill={palette.deep}
          opacity="0.62"
        />

        {/* Waterline */}
        <rect y={ridgeB + 34} width="400" height={300 - ridgeB - 34} fill={palette.land} opacity="0.88" />
        <rect y={ridgeB + 34} width="400" height="5" fill={palette.mid} opacity="0.4" />
      </svg>

      {label ? (
        <div className="relative flex size-full items-end p-4">
          <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-white/75">
            {label}
          </span>
        </div>
      ) : null}
    </div>
  )
}
