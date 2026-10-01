'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Check, Clock, Loader2, MapPin, Minus, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { ROUTES, formatDuration, formatMoney, todayUTC } from '@vamos/shared'
import type { TourDetail } from '@vamos/types'
import { Button } from '@/components/ui/Button'
import { DatePicker, type DayInfo } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { analytics } from '@/lib/analytics'
import { encodeExtras, encodeTiers } from '@/lib/booking-params'
import { cn } from '@/lib/utils'

/**
 * Booking widget - the primary conversion surface.
 *
 * Design decisions that matter here:
 *
 *  · Prices shown are computed from the option the visitor selected, but the
 *    authoritative total is recomputed server-side at booking time. The number
 *    here is a preview, never the basis of a charge.
 *
 *  · Availability is fetched per option/month rather than shipped with the
 *    page, so a tour with a year of inventory does not bloat the HTML.
 *
 *  · On mobile it collapses into a sticky bottom bar, because a widget that
 *    scrolls off-screen on a phone is the single biggest conversion leak on a
 *    tour page.
 */

type Slot = {
  date: string
  departureTime: string | null
  optionId: string
  seatsAvailable: number
  priceCents: number
  currency: string
}

export function BookingWidget({ tour }: { tour: TourDetail }) {
  const router = useRouter()

  const [optionId, setOptionId] = useState(tour.options[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [departureTime, setDepartureTime] = useState<string | null>(null)
  /**
   * Passengers per price band, keyed by tier id. Bands belong to an option,
   * so changing option resets this to one passenger in the new first band.
   */
  const [tierQty, setTierQty] = useState<Record<string, number>>(() => {
    const first = tour.options[0]?.priceTiers[0]
    return first ? { [first.id]: 1 } : {}
  })
  /** Add-on quantities, keyed by extra id. */
  const [extraQty, setExtraQty] = useState<Record<string, number>>({})
  const [pickupId, setPickupId] = useState('')
  /**
   * Availability is keyed state, not a bare list.
   *
   * `slotState.key` records which (option, date) the stored slots belong to,
   * so "loading" and "which slots apply" are DERIVED rather than tracked in
   * separate booleans that can disagree with each other.
   *
   * This also makes the widget robust to the value being set programmatically
   * — browser autofill, a bfcache restore, or a form library — none of which
   * reliably fire a React change event. Driving the fetch from an onChange
   * handler misses all of those.
   */
  const [slotState, setSlotState] = useState<{
    key: string
    slots: Slot[]
    error: string | null
  }>({ key: '', slots: [], error: null })
  const [submitting, setSubmitting] = useState(false)

  /**
   * Month-level availability for the calendar, keyed like `slotState` so the
   * loading flag is derived rather than tracked separately.
   */
  const [calendarMonth, setCalendarMonth] = useState('')
  const [calendarState, setCalendarState] = useState<{ key: string; days: Record<string, DayInfo> }>({
    key: '',
    days: {},
  })

  const option = useMemo(
    () => tour.options.find((o) => o.id === optionId) ?? tour.options[0],
    [tour.options, optionId],
  )

  /**
   * Computed once. Reading the clock during render is impure: the bounds could
   * change between two renders of the same component and make the date input
   * jump. The booking window does not need to react to time passing within a
   * single page view.
   */
  const { minDate, maxDate } = useMemo(() => {
    const today = todayUTC()
    return {
      minDate: today.toISOString().slice(0, 10),
      maxDate: new Date(today.getTime() + 365 * 86_400_000).toISOString().slice(0, 10),
    }
  }, [])

  const calendarKey = optionId && calendarMonth ? `${optionId}|${calendarMonth}` : ''
  const loadingCalendar = calendarKey !== '' && calendarState.key !== calendarKey
  const onMonthChange = useCallback((month: string) => setCalendarMonth(month), [])

  /**
   * Marks bookable days in the calendar for the month on screen.
   *
   * A hint only: a failed lookup leaves the calendar unmarked but usable, and
   * whatever day is picked is still checked by the per-day request below.
   */
  useEffect(() => {
    if (!calendarKey) return
    const [selectedOptionId, month] = calendarKey.split('|') as [string, string]
    let cancelled = false

    void (async () => {
      const days: Record<string, DayInfo> = {}
      try {
        const response = await fetch(
          `/api/availability/calendar?optionId=${encodeURIComponent(selectedOptionId)}&month=${month}`,
          { headers: { Accept: 'application/json' } },
        )
        if (response.ok) {
          const data = (await response.json()) as { days: { date: string; soldOut: boolean }[] }
          for (const day of data.days) days[day.date] = { status: day.soldOut ? 'soldout' : 'available' }
        }
      } catch {
        // Unmarked calendar; see above.
      }
      if (!cancelled) setCalendarState({ key: calendarKey, days })
    })()

    return () => {
      cancelled = true
    }
  }, [calendarKey])

  /** Identifies the availability request the current selection needs. */
  const requestKey = optionId && date ? `${optionId}|${date}` : ''

  // Derived: no separate loading flag to fall out of sync with the data.
  const loadingSlots = requestKey !== '' && slotState.key !== requestKey
  const slotError = slotState.key === requestKey ? slotState.error : null

  // Memoised so the identity is stable between renders — it feeds a useMemo
  // below, and a fresh array each render would defeat that memo.
  const slots = useMemo(
    () => (slotState.key === requestKey ? slotState.slots : []),
    [slotState, requestKey],
  )

  /**
   * Fetches availability whenever the option or date changes.
   *
   * Every state update happens after an await, so the effect body never
   * triggers a synchronous re-render.
   */
  useEffect(() => {
    if (!requestKey) return

    const [selectedOptionId, selectedDate] = requestKey.split('|') as [string, string]
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch(
          `/api/availability?optionId=${encodeURIComponent(selectedOptionId)}&date=${encodeURIComponent(selectedDate)}`,
          { headers: { Accept: 'application/json' } },
        )
        if (!response.ok) throw new Error('availability request failed')

        const data = (await response.json()) as { slots: Slot[] }
        if (cancelled) return

        setSlotState({
          key: requestKey,
          slots: data.slots,
          error:
            data.slots.length === 0
              ? 'No hay salidas disponibles para esa fecha. Probá con otra.'
              : null,
        })

        // Auto-select when there is only one departure: asking the visitor to
        // choose between one option is friction with no purpose.
        setDepartureTime(data.slots.length === 1 ? data.slots[0]!.departureTime : null)
      } catch {
        if (cancelled) return
        setSlotState({
          key: requestKey,
          slots: [],
          error: 'No pudimos consultar la disponibilidad. Intentá de nuevo en unos segundos.',
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [requestKey])

  const activeSlot = useMemo(
    () => slots.find((s) => s.departureTime === departureTime) ?? (slots.length === 1 ? slots[0] : null),
    [slots, departureTime],
  )

  const tiers = option?.priceTiers ?? []
  const pickup = tour.pickupLocations.find((p) => p.id === pickupId)
  const passengers = tiers.reduce((sum, tier) => sum + (tierQty[tier.id] ?? 0), 0)

  /**
   * A date-specific price override replaces the first band's price, exactly
   * as the server prices it. This is a preview; the server recomputes.
   */
  const unitFor = (tierIndex: number, base: number) =>
    tierIndex === 0 && activeSlot && option && activeSlot.priceCents !== option.priceCents
      ? activeSlot.priceCents
      : base

  const tierLines = tiers
    .map((tier, index) => {
      const quantity = tierQty[tier.id] ?? 0
      const unit = unitFor(index, tier.priceCents)
      return { id: tier.id, label: tier.label, quantity, unit, subtotal: unit * quantity }
    })
    .filter((line) => line.quantity > 0)

  // Per-person extras can never exceed the party, so clamp on read: lowering
  // the passenger count lowers them too, with no effect to keep in sync.
  const extraLines = tour.extras
    .map((extra) => {
      const ceiling = extra.perPerson ? passengers : 1
      const quantity = Math.min(extraQty[extra.id] ?? 0, ceiling)
      return { id: extra.id, label: extra.name, quantity, unit: extra.priceCents, subtotal: extra.priceCents * quantity }
    })
    .filter((line) => line.quantity > 0)

  const estimatedTotal =
    tierLines.reduce((sum, line) => sum + line.subtotal, 0) +
    extraLines.reduce((sum, line) => sum + line.subtotal, 0) +
    (pickup?.extraCostCents ?? 0) * passengers

  const firstTierCount = tiers[0] ? (tierQty[tiers[0].id] ?? 0) : 0

  const maxParticipants = option?.maxParticipants ?? 20
  const seatsAvailable = activeSlot?.seatsAvailable ?? null
  const overCapacity = passengers > maxParticipants
  const overSeats = seatsAvailable !== null && passengers > seatsAvailable

  const canSubmit =
    Boolean(optionId) &&
    Boolean(date) &&
    Boolean(activeSlot) &&
    !overCapacity &&
    !overSeats &&
    firstTierCount >= 1 &&
    !submitting

  function submit() {
    if (!canSubmit || !option) return
    setSubmitting(true)

    analytics.bookingStarted(
      {
        item_id: tour.slug,
        item_name: tour.name,
        item_category: tour.category.name,
        price: estimatedTotal / 100,
        quantity: passengers,
      },
      option.currency,
    )

    // The selection travels in the URL so the reservation page is linkable and
    // survives a refresh; it is re-validated and re-priced server-side there.
    const params = new URLSearchParams({
      tour: tour.slug,
      opcion: optionId,
      fecha: date,
      pax: encodeTiers(tierLines.map((line) => ({ tierId: line.id, quantity: line.quantity }))),
    })
    const extrasParam = encodeExtras(extraLines.map((line) => ({ extraId: line.id, quantity: line.quantity })))
    if (extrasParam) params.set('extras', extrasParam)
    if (departureTime) params.set('horario', departureTime)
    if (pickupId) params.set('pickup', pickupId)

    // Carry campaign attribution forward - dropping it here would make every
    // paid conversion look organic.
    const currentParams = new URLSearchParams(window.location.search)
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid']) {
      const value = currentParams.get(key)
      if (value) params.set(key, value)
    }

    router.push(`${ROUTES.book}?${params.toString()}`)
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-[1.25rem] border border-magenta-500/30 bg-surface shadow-float">
        {/* Price header */}
        <div className="relative border-b border-border bg-gradient-to-br from-primary-soft via-surface to-accent-soft/60 px-5 pb-5 pt-6">
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-plum-950 px-3 py-1 text-[0.6875rem] font-bold text-white ring-1 ring-white/10 dark:bg-violet-700">
            <Clock className="size-3" aria-hidden="true" />
            {formatDuration(tour.durationMinutes)}
          </span>
          <p className="text-[0.75rem] font-semibold text-accent">Desde</p>
          <p className="mt-0.5 font-display text-[2.25rem] font-bold leading-none text-heading">
            {formatMoney(tour.fromPriceCents ?? 0, tour.currency)}
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-accent">por persona</p>
        </div>

        <div className="space-y-5 p-5">
          {/* Option */}
          <div>
            <label htmlFor="bw-option" className="mb-2 block text-[0.8125rem] font-bold text-heading">
              Opción
            </label>
            <Select
              id="bw-option"
              value={optionId}
              onChange={(next) => {
                setOptionId(next)
                setDepartureTime(null)
                const first = tour.options.find((o) => o.id === next)?.priceTiers[0]
                setTierQty(first ? { [first.id]: 1 } : {})
              }}
              options={tour.options.map((o) => ({
                value: o.id,
                label: o.name,
                description: o.description ?? undefined,
                meta: formatMoney(o.priceCents, o.currency),
              }))}
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="bw-date" className="mb-2 block text-[0.8125rem] font-bold text-heading">
              Fecha
            </label>
            <DatePicker
              id="bw-date"
              value={date}
              onChange={setDate}
              min={minDate}
              max={maxDate}
              placeholder="Elegí el día de la excursión"
              dayInfo={calendarState.key === calendarKey ? calendarState.days : undefined}
              onMonthChange={onMonthChange}
              loading={loadingCalendar}
              legend
            />
            <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted-foreground">
              El horario depende de la disponibilidad al momento de la reserva y se confirma el día anterior.
              Si contratás traslado, el horario de búsqueda también se confirma el día anterior.
            </p>
          </div>

          {/* Departure time */}
          {date && slots.length > 1 ? (
            <fieldset>
              <legend className="mb-2 text-[0.8125rem] font-bold text-heading">Horario</legend>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={`${slot.departureTime}`}
                    type="button"
                    disabled={slot.seatsAvailable < passengers}
                    onClick={() => setDepartureTime(slot.departureTime)}
                    aria-pressed={departureTime === slot.departureTime}
                    className={cn(
                      'rounded-xl border px-3.5 py-2 text-[0.8125rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40',
                      departureTime === slot.departureTime
                        ? 'border-transparent bg-gradient-to-r from-violet-600 to-magenta-500 text-white shadow-[0_6px_16px_rgb(108_88_254/0.3)]'
                        : 'border-border-strong bg-surface text-foreground hover:border-primary hover:text-primary',
                    )}
                  >
                    {slot.departureTime ?? 'A coordinar'}
                    <span className="ml-1.5 text-[0.6875rem] opacity-70">
                      {slot.seatsAvailable} lug.
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {loadingSlots ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Consultando disponibilidad…
            </p>
          ) : null}

          {/* Passengers */}
          <fieldset className="space-y-2.5">
            <legend className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-bold text-heading">
              <Users className="size-4 text-primary" aria-hidden="true" />
              Pasajeros
            </legend>

            {tiers.map((tier, index) => {
              const value = tierQty[tier.id] ?? 0
              const others = passengers - value
              return (
                <Counter
                  key={tier.id}
                  id={`bw-tier-${tier.id}`}
                  label={tier.label}
                  hint={
                    tier.priceCents === 0
                      ? 'Gratis'
                      : formatMoney(unitFor(index, tier.priceCents), tour.currency) + ' c/u'
                  }
                  value={value}
                  // The first band is the adult rate: a booking needs one.
                  min={index === 0 ? 1 : 0}
                  max={Math.max(0, maxParticipants - others)}
                  onChange={(next) => setTierQty((current) => ({ ...current, [tier.id]: next }))}
                />
              )
            })}
            {tour.minAge != null || tour.maxAge != null ? (
              <p className="text-[0.6875rem] text-muted-foreground">
                {tour.minAge != null && tour.maxAge != null
                  ? `Solo para personas de ${tour.minAge} a ${tour.maxAge} años.`
                  : tour.minAge != null
                    ? `Edad mínima: ${tour.minAge} años.`
                    : `Edad máxima: ${tour.maxAge} años.`}
              </p>
            ) : null}
          </fieldset>

          {/* Add-ons ("Opcionales") */}
          {tour.extras.length > 0 ? (
            <fieldset className="space-y-2.5">
              <legend className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-bold text-heading">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                Opcionales
              </legend>
              {tour.extras.map((extra) => {
                const value = Math.min(extraQty[extra.id] ?? 0, extra.perPerson ? passengers : 1)
                const set = (next: number) => setExtraQty((current) => ({ ...current, [extra.id]: next }))
                return extra.perPerson ? (
                  <Counter
                    key={extra.id}
                    id={`bw-extra-${extra.id}`}
                    label={extra.name}
                    hint={`${formatMoney(extra.priceCents, tour.currency)} por persona`}
                    description={extra.description ?? undefined}
                    value={value}
                    min={0}
                    max={passengers}
                    onChange={set}
                  />
                ) : (
                  <label
                    key={extra.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                      value ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={value > 0}
                      onChange={(event) => set(event.target.checked ? 1 : 0)}
                      className="mt-0.5 size-4 shrink-0 rounded border-border-strong text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-heading">{extra.name}</span>
                      {extra.description ? (
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{extra.description}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      {formatMoney(extra.priceCents, tour.currency)}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          ) : null}

          {/* Pickup */}
          {tour.pickupLocations.length > 0 ? (
            <div>
              <label htmlFor="bw-pickup" className="mb-2 block text-[0.8125rem] font-bold text-heading">
                Punto de encuentro
              </label>
              <Select
                id="bw-pickup"
                value={pickupId}
                onChange={setPickupId}
                leadingIcon={<MapPin className="size-4" aria-hidden="true" />}
                options={[
                  { value: '', label: 'Elegir más adelante', description: 'Te lo pedimos al confirmar la reserva.' },
                  ...tour.pickupLocations.map((location) => ({
                    value: location.id,
                    label: location.name,
                    meta:
                      location.extraCostCents > 0
                        ? `+${formatMoney(location.extraCostCents, tour.currency)}`
                        : 'Sin cargo',
                  })),
                ]}
              />
            </div>
          ) : null}

          {/* Messages */}
          {slotError ? (
            <p role="alert" className="rounded-control bg-warning-soft px-3 py-2.5 text-xs text-warning">
              {slotError}
            </p>
          ) : null}

          {overCapacity ? (
            <p role="alert" className="rounded-control bg-danger-soft px-3 py-2.5 text-xs text-danger">
              Esta opción admite hasta {maxParticipants} pasajeros. Para grupos mayores,{' '}
              <a href={ROUTES.contact} className="underline">
                consultanos
              </a>
              .
            </p>
          ) : null}

          {overSeats && !overCapacity ? (
            <p role="alert" className="rounded-control bg-warning-soft px-3 py-2.5 text-xs text-warning">
              Solo quedan {seatsAvailable} lugares para esa salida.
            </p>
          ) : null}

          {/* Total */}
          {date && activeSlot ? (
            <div className="space-y-1.5 rounded-xl border border-border bg-surface-muted p-4">
              {tierLines.map((line) => (
                <div key={line.id} className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {line.quantity} × {line.label}
                  </span>
                  <span className="shrink-0">{line.unit === 0 ? 'Gratis' : formatMoney(line.subtotal, tour.currency)}</span>
                </div>
              ))}
              {extraLines.map((line) => (
                <div key={line.id} className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {line.label}
                    {line.quantity > 1 ? ` × ${line.quantity}` : ''}
                  </span>
                  <span className="shrink-0">{formatMoney(line.subtotal, tour.currency)}</span>
                </div>
              ))}

              {pickup && pickup.extraCostCents > 0 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Punto de encuentro</span>
                  <span>{formatMoney(pickup.extraCostCents * passengers, tour.currency)}</span>
                </div>
              ) : null}

              <div className="flex items-baseline justify-between border-t border-border pt-2.5 text-sm font-bold text-heading">
                <span>Total estimado</span>
                <span className="font-display text-xl">{formatMoney(estimatedTotal, tour.currency)}</span>
              </div>
            </div>
          ) : null}

          <Button fullWidth size="lg" variant="accent" disabled={!canSubmit} onClick={submit}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Preparando…
              </>
            ) : (
              <>
                <CalendarCheck className="size-4" aria-hidden="true" />
                Continuar con la reserva
              </>
            )}
          </Button>

          <ul className="space-y-2 rounded-xl bg-surface-muted p-3.5 text-xs text-muted-foreground">
            {option && option.freeCancellationHours > 0 ? (
              <li className="flex items-start gap-1.5">
                <Check className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
                Cancelación sin cargo hasta {option.freeCancellationHours} h antes
              </li>
            ) : null}
            <li className="flex items-start gap-1.5">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-primary" aria-hidden="true" />
              Pago procesado por plataformas seguras
            </li>
          </ul>
        </div>
      </div>

      {/* Sticky mobile bar - the widget above scrolls away on a phone. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/97 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] text-muted-foreground">Desde</p>
            <p className="truncate font-display text-lg font-bold leading-none text-heading">
              {formatMoney(tour.fromPriceCents ?? 0, tour.currency)}
            </p>
          </div>
          <Button
            size="md"
            onClick={() => {
              document
                .getElementById('reservar')
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          >
            Reservar
          </Button>
        </div>
      </div>
    </>
  )
}

function Counter({
  id,
  label,
  hint,
  description,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  description?: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3.5 py-2.5">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-heading">
          {label}
        </label>
        {hint ? <p className="text-[0.6875rem] font-medium text-primary">{hint}</p> : null}
        {description ? <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Quitar uno: ${label}`}
          className="grid size-9 place-items-center rounded-full border border-border-strong text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-35"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>

        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
          }}
          className="w-10 border-0 bg-transparent text-center text-base font-bold text-heading focus:outline-none focus:ring-0"
        />

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Agregar uno: ${label}`}
          className="grid size-9 place-items-center rounded-full border border-border-strong text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-35"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
