'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Minus, Plus, ShieldCheck } from 'lucide-react'
import { ROUTES, formatDuration, formatMoney, todayUTC } from '@vamos/shared'
import type { TourDetail } from '@vamos/types'
import { Button } from '@/components/ui/Button'
import { analytics } from '@/lib/analytics'
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
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
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

  // Lets the widget read a value the browser set without a React event.
  const dateInputRef = useRef<HTMLInputElement>(null)

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

  /**
   * Recovers a date the browser already holds.
   *
   * Three cases set an input's value without React seeing a change event:
   * a visitor typing before hydration finishes, browser autofill, and a
   * back/forward (bfcache) restore. Without this the control silently resets
   * and the visitor's selection is lost.
   *
   * The update runs after an await so the effect body never triggers a
   * synchronous re-render.
   */
  useEffect(() => {
    let cancelled = false
    void (async () => {
      await Promise.resolve()
      if (cancelled) return
      const current = dateInputRef.current?.value
      if (current) setDate((existing) => existing || current)
    })()
    return () => {
      cancelled = true
    }
  }, [])

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

  const unitCents = activeSlot?.priceCents ?? option?.priceCents ?? 0
  const childUnitCents = option?.childPriceCents ?? unitCents
  const pickup = tour.pickupLocations.find((p) => p.id === pickupId)
  const passengers = adults + children

  const estimatedTotal =
    unitCents * adults + childUnitCents * children + (pickup?.extraCostCents ?? 0) * passengers

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
    adults >= 1 &&
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
      adultos: String(adults),
      menores: String(children),
    })
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
      <div className="rounded-card border border-border bg-surface shadow-raised">
        <div className="border-b border-border p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Desde
              </p>
              <p className="mt-0.5 font-display text-[1.75rem] font-bold leading-none text-heading">
                {formatMoney(tour.fromPriceCents ?? 0, tour.currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">por persona</p>
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {formatDuration(tour.durationMinutes)}
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Option */}
          <div>
            <label htmlFor="bw-option" className="mb-1.5 block text-[0.8125rem] font-bold text-heading">
              Opción
            </label>
            <div className="relative">
              <select
                id="bw-option"
                value={optionId}
                onChange={(event) => {
                  setOptionId(event.target.value)
                  setDepartureTime(null)
                }}
                className="w-full appearance-none rounded-control border border-border-strong bg-surface py-2.5 pl-3 pr-9 text-sm text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {tour.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} - {formatMoney(o.priceCents, o.currency)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            {option?.description ? (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
            ) : null}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="bw-date" className="mb-1.5 block text-[0.8125rem] font-bold text-heading">
              Fecha
            </label>
            <input
              id="bw-date"
              ref={dateInputRef}
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-control border border-border-strong bg-surface px-3 py-2.5 text-sm text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Departure time */}
          {date && slots.length > 1 ? (
            <fieldset>
              <legend className="mb-1.5 text-[0.8125rem] font-bold text-heading">Horario</legend>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={`${slot.departureTime}`}
                    type="button"
                    disabled={slot.seatsAvailable < passengers}
                    onClick={() => setDepartureTime(slot.departureTime)}
                    aria-pressed={departureTime === slot.departureTime}
                    className={cn(
                      'rounded-control border px-3 py-2 text-[0.8125rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      departureTime === slot.departureTime
                        ? 'border-violet-700 bg-violet-700 text-white'
                        : 'border-border-strong bg-surface text-foreground hover:border-primary',
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
          <fieldset className="space-y-3">
            <legend className="text-[0.8125rem] font-bold text-heading">Pasajeros</legend>

            <Counter
              label="Adultos"
              hint={option?.minParticipants && option.minParticipants > 1 ? `Mínimo ${option.minParticipants}` : undefined}
              value={adults}
              min={1}
              max={maxParticipants}
              onChange={setAdults}
            />

            {option?.childPriceCents ? (
              <Counter
                label="Menores"
                hint={tour.minAge ? `Desde ${tour.minAge} años` : 'Tarifa reducida'}
                value={children}
                min={0}
                max={Math.max(0, maxParticipants - adults)}
                onChange={setChildren}
              />
            ) : null}
          </fieldset>

          {/* Pickup */}
          {tour.pickupLocations.length > 0 ? (
            <div>
              <label htmlFor="bw-pickup" className="mb-1.5 block text-[0.8125rem] font-bold text-heading">
                Punto de encuentro
              </label>
              <div className="relative">
                <select
                  id="bw-pickup"
                  value={pickupId}
                  onChange={(event) => setPickupId(event.target.value)}
                  className="w-full appearance-none rounded-control border border-border-strong bg-surface py-2.5 pl-3 pr-9 text-sm text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Elegir más adelante</option>
                  {tour.pickupLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.extraCostCents > 0
                        ? ` (+${formatMoney(location.extraCostCents, tour.currency)})`
                        : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
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
            <div className="space-y-1.5 rounded-control bg-surface-muted p-3.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {adults} × {formatMoney(unitCents, tour.currency)}
                </span>
                <span>{formatMoney(unitCents * adults, tour.currency)}</span>
              </div>

              {children > 0 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {children} menores × {formatMoney(childUnitCents, tour.currency)}
                  </span>
                  <span>{formatMoney(childUnitCents * children, tour.currency)}</span>
                </div>
              ) : null}

              {pickup && pickup.extraCostCents > 0 ? (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Punto de encuentro</span>
                  <span>{formatMoney(pickup.extraCostCents * passengers, tour.currency)}</span>
                </div>
              ) : null}

              <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-heading">
                <span>Total estimado</span>
                <span>{formatMoney(estimatedTotal, tour.currency)}</span>
              </div>
            </div>
          ) : null}

          <Button fullWidth size="lg" disabled={!canSubmit} onClick={submit}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Preparando…
              </>
            ) : (
              'Continuar con la reserva'
            )}
          </Button>

          <ul className="space-y-1.5 text-[0.6875rem] text-muted-foreground">
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
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const id = `counter-${label.toLowerCase()}`

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-heading">
          {label}
        </label>
        {hint ? <p className="text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Quitar un ${label.toLowerCase().replace(/e?s$/, '')}`}
          className="grid size-9 place-items-center rounded-control border border-border-strong text-foreground transition-colors hover:border-primary disabled:opacity-35"
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
          className="w-11 border-0 bg-transparent text-center text-sm font-semibold text-heading focus:outline-none focus:ring-0"
        />

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Agregar un ${label.toLowerCase().replace(/e?s$/, '')}`}
          className="grid size-9 place-items-center rounded-control border border-border-strong text-foreground transition-colors hover:border-primary disabled:opacity-35"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
