'use client'

import { useState } from 'react'
import { CloudSun, Leaf, Snowflake, Sun } from 'lucide-react'
import type { MediaRef } from '@vamos/types'
import { SmartImage } from '@/components/media/SmartImage'
import { cn } from '@/lib/utils'

export type Season = {
  id: string
  name: string
  months: string
  daylight: string
  temperature: string
  description: string
  goodFor: string[]
  media: MediaRef | null
}

const ICONS = { verano: Sun, otono: Leaf, invierno: Snowflake, primavera: CloudSun } as const

/**
 * "When to travel" as tabs rather than an article.
 *
 * A proper ARIA tablist: arrow keys move between tabs, only the selected tab
 * is in the tab order, and each panel is labelled by its tab. All four panels
 * are server-rendered and merely hidden, so the content is indexable.
 */
export function SeasonTabs({ seasons }: { seasons: Season[] }) {
  const [selected, setSelected] = useState(0)

  function onKeyDown(event: React.KeyboardEvent) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (selected + delta + seasons.length) % seasons.length
    setSelected(next)
    document.getElementById(`season-tab-${seasons[next]?.id}`)?.focus()
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Estaciones del año"
        onKeyDown={onKeyDown}
        className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:justify-center sm:px-0"
      >
        {seasons.map((season, index) => {
          const Icon = ICONS[season.id as keyof typeof ICONS] ?? Sun
          const active = index === selected
          return (
            <button
              key={season.id}
              id={`season-tab-${season.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`season-panel-${season.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(index)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200',
                active
                  ? 'bg-gradient-to-r from-violet-600 to-magenta-500 text-white shadow-[0_8px_22px_rgb(108_88_254/0.3)]'
                  : 'border border-border bg-surface text-foreground hover:border-primary/50 hover:text-primary',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {season.name}
              <span className={cn('hidden text-xs font-medium sm:inline', active ? 'text-white/75' : 'text-subtle-foreground')}>
                {season.months}
              </span>
            </button>
          )
        })}
      </div>

      {seasons.map((season, index) => (
        <div
          key={season.id}
          id={`season-panel-${season.id}`}
          role="tabpanel"
          aria-labelledby={`season-tab-${season.id}`}
          hidden={index !== selected}
          className="mt-10"
        >
          <div className="grid overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-raised lg:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-[17rem] lg:min-h-[26rem]">
              <SmartImage
                key={season.id}
                media={season.media}
                seed={`season-${season.id}`}
                alt=""
                sizes="(max-width: 1023px) 100vw, 55vw"
                className="animate-rise-in"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-plum-950/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-plum-950/10" />
              <p className="absolute bottom-5 left-5 font-display text-[2.5rem] font-bold leading-none text-white sm:text-[3.25rem]">
                {season.name}
              </p>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-10">
              <dl className="grid grid-cols-3 gap-3">
                <SeasonStat label="Meses" value={season.months} />
                <SeasonStat label="Luz diurna" value={season.daylight} />
                <SeasonStat label="Temperatura" value={season.temperature} />
              </dl>

              <p className="mt-7 text-[0.9375rem] leading-relaxed text-foreground">{season.description}</p>

              <p className="mt-7 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-primary">
                Ideal para
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {season.goodFor.map((item) => (
                  <li
                    key={item}
                    className="rounded-full bg-primary-soft px-3.5 py-1.5 text-[0.8125rem] font-medium text-primary"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SeasonStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-card bg-surface-muted p-3 ring-1 ring-inset ring-border">
      <dt className="order-2 mt-1 text-[0.6875rem] text-muted-foreground">{label}</dt>
      <dd className="text-[0.875rem] font-bold leading-tight text-heading">{value}</dd>
    </div>
  )
}
