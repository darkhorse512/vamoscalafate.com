'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Per-day annotation, e.g. from an availability lookup. */
export type DayInfo = {
  /** `available` marks bookable days; `soldout` strikes them through. */
  status?: 'available' | 'soldout'
  /** Short text under the day number, such as a price. */
  note?: string
}

const WEEKDAYS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const MONTH_FMT = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const LONG_FMT = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const DAY_LABEL_FMT = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

// ── Date helpers ──────────────────────────────────────────────────────────
//
// Everything works on ISO `YYYY-MM-DD` strings and UTC dates. A tour date is
// a calendar day, not an instant; doing this arithmetic in local time would
// shift days for any visitor whose clock is not on Argentine time.

function parse(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}
function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}
function addDays(iso: string, days: number): string {
  const date = parse(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toIso(date)
}
function addMonths(iso: string, months: number): string {
  const date = parse(iso)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  // Clamp: 31 January + 1 month is the last day of February, not 3 March.
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return toIso(date)
}
function monthKey(iso: string): string {
  return iso.slice(0, 7)
}
/** Sentence case: CSS `capitalize` would also give "Octubre De 2026". */
function sentenceCase(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
/** Monday-first weekday index, 0–6. */
function weekdayIndex(iso: string): number {
  return (parse(iso).getUTCDay() + 6) % 7
}

/**
 * Calendar date picker, replacing <input type="date">.
 *
 * The native control looks different in every browser, cannot show which
 * days are bookable, and on desktop Chrome is a tiny icon in a text box. This
 * is a proper calendar in Spanish, Monday-first as in Argentina, and can mark
 * each day as available or sold out with a note such as a price.
 *
 * Accessibility follows the WAI-ARIA date picker dialog pattern: the trigger
 * opens a dialog holding a grid; arrow keys move by day and week, PageUp /
 * PageDown by month (with Shift, by year), Home / End to the week's ends,
 * Enter selects and Escape closes and returns focus to the trigger.
 *
 * With `name`, a hidden input submits the value as `YYYY-MM-DD`.
 */
export function DatePicker({
  id,
  name,
  value,
  onChange,
  min,
  max,
  placeholder = 'Elegir fecha',
  size = 'md',
  className,
  dayInfo,
  onMonthChange,
  loading = false,
  clearable = false,
  'aria-describedby': ariaDescribedBy,
  legend,
}: {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  dayInfo?: Record<string, DayInfo>
  /** Called with `YYYY-MM` whenever the visible month changes. */
  onMonthChange?: (month: string) => void
  loading?: boolean
  clearable?: boolean
  'aria-describedby'?: string
  /** Show the available / sold-out legend under the grid. */
  legend?: boolean
}) {
  const autoId = useId()
  const triggerId = id ?? `date-${autoId}`
  const dialogId = `${triggerId}-dialog`
  const titleId = `${triggerId}-title`

  const [open, setOpen] = useState(false)
  const [focusIso, setFocusIso] = useState(() => value || min || todayIso())
  const [alignRight, setAlignRight] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  /** Set when focus should move into the grid on the next render. */
  const moveFocus = useRef(false)

  const visibleMonth = monthKey(focusIso)

  const isDisabled = useCallback(
    (iso: string) => Boolean((min && iso < min) || (max && iso > max)),
    [min, max],
  )

  /** Clamps a candidate focus date into the allowed range. */
  const clamp = useCallback(
    (iso: string) => (min && iso < min ? min : max && iso > max ? max : iso),
    [min, max],
  )

  // Report the visible month so callers can fetch that month's data.
  useEffect(() => {
    if (open) onMonthChange?.(visibleMonth)
  }, [open, visibleMonth, onMonthChange])

  // Move DOM focus to the focused day after keyboard navigation.
  useEffect(() => {
    if (!open || !moveFocus.current) return
    moveFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusIso}"]`)?.focus()
  }, [open, focusIso])

  // Keep the popover on screen: open leftwards near the right edge.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setAlignRight(rect.left + 336 > window.innerWidth - 12 && rect.right > 336)
  }, [open])

  // Close on an outside press.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function openPicker() {
    setFocusIso(clamp(value || todayIso()))
    moveFocus.current = true
    setOpen(true)
  }

  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function select(iso: string) {
    if (isDisabled(iso)) return
    onChange(iso)
    close()
  }

  function goToMonth(delta: number) {
    setFocusIso((current) => clamp(addMonths(current, delta)))
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusIso, -1),
      ArrowRight: () => addDays(focusIso, 1),
      ArrowUp: () => addDays(focusIso, -7),
      ArrowDown: () => addDays(focusIso, 7),
      Home: () => addDays(focusIso, -weekdayIndex(focusIso)),
      End: () => addDays(focusIso, 6 - weekdayIndex(focusIso)),
      PageUp: () => addMonths(focusIso, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusIso, event.shiftKey ? 12 : 1),
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      moveFocus.current = true
      setFocusIso(clamp(move()))
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  /** The 6×7 grid of ISO dates for the visible month, Monday-first. */
  const cells = useMemo(() => {
    const first = `${visibleMonth}-01`
    const start = addDays(first, -weekdayIndex(first))
    return Array.from({ length: 42 }, (_, index) => addDays(start, index))
  }, [visibleMonth])

  const today = todayIso()
  const canPrev = !min || monthKey(addMonths(`${visibleMonth}-01`, -1)) >= monthKey(min)
  const canNext = !max || monthKey(addMonths(`${visibleMonth}-01`, 1)) <= monthKey(max)

  const heights = { sm: 'h-10 text-[0.8125rem]', md: 'h-12 text-sm', lg: 'h-14 text-[0.9375rem]' }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <div className="relative">
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          aria-describedby={ariaDescribedBy}
          data-value={value}
          onClick={() => (open ? close(false) : openPicker())}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && !open) {
              event.preventDefault()
              openPicker()
            }
          }}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl border bg-surface pl-3.5 text-left transition-all duration-150',
            clearable && value ? 'pr-10' : 'pr-3',
            heights[size],
            open
              ? 'border-primary ring-4 ring-primary/15'
              : 'border-border-strong hover:border-primary/50 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15',
          )}
        >
          <CalendarDays className="size-[1.125rem] shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {value ? (
              <span className="font-medium text-heading">{sentenceCase(LONG_FMT.format(parse(value)))}</span>
            ) : (
              <span className="text-subtle-foreground">{placeholder}</span>
            )}
          </span>
        </button>

        {clearable && value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Borrar fecha"
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-strong hover:text-heading"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className={cn(
            'animate-pop-in absolute top-full z-50 mt-2 w-[21rem] max-w-[calc(100vw-2rem)] origin-top rounded-2xl border border-border bg-surface p-4 shadow-float',
            alignRight ? 'right-0' : 'left-0',
          )}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goToMonth(-1)}
              disabled={!canPrev}
              aria-label="Mes anterior"
              className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <p
              id={titleId}
              aria-live="polite"
              className="flex items-center gap-2 font-display text-[1.0625rem] font-semibold text-heading"
            >
              {sentenceCase(MONTH_FMT.format(parse(`${visibleMonth}-01`)))}
              {loading ? <Loader2 className="size-3.5 animate-spin text-primary" aria-label="Cargando" /> : null}
            </p>
            <button
              type="button"
              onClick={() => goToMonth(1)}
              disabled={!canNext}
              aria-label="Mes siguiente"
              className="grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Grid */}
          <div ref={gridRef} role="grid" aria-labelledby={titleId} onKeyDown={onGridKeyDown} className="mt-3">
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  role="columnheader"
                  className="pb-2 text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-subtle-foreground"
                >
                  {day}
                </span>
              ))}
            </div>

            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="grid grid-cols-7 gap-y-1">
                {cells.slice(week * 7, week * 7 + 7).map((iso) => {
                  const inMonth = monthKey(iso) === visibleMonth
                  const disabled = isDisabled(iso)
                  const info = dayInfo?.[iso]
                  const soldOut = info?.status === 'soldout'
                  const available = info?.status === 'available'
                  const selected = iso === value
                  const isToday = iso === today

                  if (!inMonth) return <span key={iso} role="gridcell" aria-hidden="true" />

                  return (
                    <span key={iso} role="gridcell" aria-selected={selected} className="grid place-items-center">
                      <button
                        type="button"
                        data-date={iso}
                        tabIndex={iso === focusIso ? 0 : -1}
                        disabled={disabled}
                        onClick={() => select(iso)}
                        onFocus={() => setFocusIso(iso)}
                        aria-label={`${DAY_LABEL_FMT.format(parse(iso))}${
                          available ? ', con lugares' : soldOut ? ', agotado' : ''
                        }${info?.note ? `, ${info.note}` : ''}`}
                        aria-current={isToday ? 'date' : undefined}
                        className={cn(
                          'relative flex size-11 flex-col items-center justify-center rounded-xl text-sm leading-none transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          disabled && 'cursor-not-allowed text-subtle-foreground/50',
                          !disabled && !selected && 'text-heading hover:bg-primary-soft hover:text-primary',
                          !disabled && available && !selected && 'font-semibold',
                          soldOut && !selected && 'text-subtle-foreground line-through decoration-1',
                          isToday && !selected && 'ring-1 ring-inset ring-primary/40',
                          selected &&
                            'bg-gradient-to-br from-violet-600 to-magenta-500 font-bold text-white shadow-[0_6px_16px_rgb(108_88_254/0.35)]',
                        )}
                      >
                        <span>{parse(iso).getUTCDate()}</span>
                        {info?.note && !disabled ? (
                          <span className={cn('mt-0.5 text-[0.5625rem] font-medium', selected ? 'text-white/85' : 'text-muted-foreground')}>
                            {info.note}
                          </span>
                        ) : available && !selected ? (
                          <span className="absolute bottom-1.5 size-1 rounded-full bg-success" aria-hidden="true" />
                        ) : null}
                      </button>
                    </span>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            {legend ? (
              <div className="flex items-center gap-3 text-[0.6875rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                  Con lugares
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-subtle-foreground line-through">12</span>
                  Agotado
                </span>
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={isDisabled(today)}
              onClick={() => {
                moveFocus.current = true
                setFocusIso(clamp(today))
              }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-40"
            >
              Hoy
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
