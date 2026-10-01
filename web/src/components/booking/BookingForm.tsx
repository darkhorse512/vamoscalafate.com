'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { ROUTES, formatDate, formatMoney } from '@vamos/shared'
import type { PriceBreakdown } from '@vamos/types'
import { Button } from '@/components/ui/Button'
import { analytics } from '@/lib/analytics'
import { createBookingAction } from '@/server/actions/booking'
import { cn } from '@/lib/utils'

/**
 * Customer details form.
 *
 * Client-side validation here exists purely to give fast feedback. The server
 * action re-parses everything with the same Zod schema and re-prices from the
 * database - the totals rendered below are a preview, not the basis of a charge.
 *
 * Errors are announced via role="alert" and each field is wired to its message
 * with aria-describedby, so a screen-reader user learns what went wrong
 * without hunting.
 */

type FieldErrors = Record<string, string[]>

export function BookingForm({
  tour,
  option,
  selection,
  pickupLocations,
  breakdown,
  seatsAvailable,
  attribution,
}: {
  tour: {
    id: string
    slug: string
    name: string
    categoryName: string
    currency: string
    cancellationPolicy: string | null
    detailPath: string
  }
  option: { id: string; name: string; freeCancellationHours: number }
  selection: {
    date: string
    departureTime: string | null
    adults: number
    children: number
    pickupLocationId: string | null
  }
  pickupLocations: { id: string; name: string; extraCostCents: number }[]
  breakdown: PriceBreakdown
  seatsAvailable: number | null
  attribution: Record<string, string>
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [pickupId, setPickupId] = useState(selection.pickupLocationId ?? '')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})

    const form = new FormData(event.currentTarget)

    const payload = {
      selection: {
        tourId: tour.id,
        optionId: option.id,
        date: selection.date,
        departureTime: selection.departureTime,
        adults: selection.adults,
        children: selection.children,
        pickupLocationId: pickupId || null,
      },
      customer: {
        firstName: String(form.get('firstName') ?? ''),
        lastName: String(form.get('lastName') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
        country: String(form.get('country') ?? ''),
        hotelName: String(form.get('hotelName') ?? ''),
        specialRequests: String(form.get('specialRequests') ?? ''),
        marketingOptIn: form.get('marketingOptIn') === 'on',
      },
      passengers: [],
      attribution: {
        utmSource: attribution.utm_source,
        utmMedium: attribution.utm_medium,
        utmCampaign: attribution.utm_campaign,
        utmTerm: attribution.utm_term,
        utmContent: attribution.utm_content,
      },
      website: String(form.get('website') ?? ''),
      acceptedTerms: form.get('acceptedTerms') === 'on',
    }

    const result = await createBookingAction(payload)

    if (!result.ok) {
      setFormError(result.message)
      // Server field errors are nested under selection.* / customer.*; flatten
      // the leaf name so it matches the input's `name` attribute.
      if (result.fieldErrors) {
        const flat: FieldErrors = {}
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          flat[key.split('.').pop() ?? key] = messages
        }
        setFieldErrors(flat)
      }
      setSubmitting(false)
      // Move focus to the error so it is announced and visible.
      document.getElementById('booking-error')?.focus()
      return
    }

    analytics.beginCheckout(
      [
        {
          item_id: tour.slug,
          item_name: tour.name,
          item_category: tour.categoryName,
          price: result.data.totalCents / 100,
          quantity: selection.adults + selection.children,
        },
      ],
      result.data.totalCents / 100,
      result.data.currency,
    )

    router.push(`${ROUTES.checkout}?ref=${encodeURIComponent(result.data.reference)}`)
  }

  const pickup = pickupLocations.find((p) => p.id === pickupId)
  const passengers = selection.adults + selection.children
  const pickupCost = (pickup?.extraCostCents ?? 0) * passengers
  const displayTotal = breakdown.adultsSubtotalCents + breakdown.childrenSubtotalCents + pickupCost

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10">
      {/* ── Customer details ────────────────────────────────────────── */}
      <div className="min-w-0">
        {formError ? (
          <div
            id="booking-error"
            role="alert"
            tabIndex={-1}
            className="mb-6 flex gap-3 rounded-card border-l-[3px] border-[#9b3232] bg-[#fbeeee] p-4"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#9b3232]" aria-hidden="true" />
            <p className="text-sm text-[#9b3232]">{formError}</p>
          </div>
        ) : null}

        <fieldset className="rounded-card border border-border p-5 sm:p-6">
          <legend className="px-2 font-display text-base font-semibold text-heading">
            Tus datos
          </legend>

          <div className="mt-3 grid gap-5 sm:grid-cols-2">
            <Field name="firstName" label="Nombre" required errors={fieldErrors} autoComplete="given-name" />
            <Field name="lastName" label="Apellido" required errors={fieldErrors} autoComplete="family-name" />
            <Field name="email" label="Email" type="email" required errors={fieldErrors} autoComplete="email" hint="Te enviamos la confirmación a esta dirección." />
            <Field name="phone" label="Teléfono" type="tel" required errors={fieldErrors} autoComplete="tel" hint="Con código de país." />
            <Field name="country" label="País de residencia" required errors={fieldErrors} autoComplete="country-name" />
            <Field name="hotelName" label="Alojamiento en El Calafate" errors={fieldErrors} hint="Opcional. Nos ayuda a coordinar el traslado." />
          </div>

          {pickupLocations.length > 0 ? (
            <div className="mt-5">
              <label htmlFor="pickup" className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
                Punto de encuentro
              </label>
              <select
                id="pickup"
                value={pickupId}
                onChange={(event) => setPickupId(event.target.value)}
                className="w-full rounded-control border border-border-strong bg-surface px-3 py-2.5 text-sm focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
              >
                <option value="">Coordinar por email</option>
                {pickupLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                    {location.extraCostCents > 0
                      ? ` (+${formatMoney(location.extraCostCents, tour.currency)} p/persona)`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="mt-5">
            <label htmlFor="specialRequests" className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
              Comentarios
            </label>
            <textarea
              id="specialRequests"
              name="specialRequests"
              rows={3}
              maxLength={1000}
              placeholder="Restricciones alimentarias, movilidad reducida, viajás con niños pequeños…"
              className="w-full rounded-control border border-border-strong bg-surface px-3 py-2.5 text-sm focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
            />
          </div>
        </fieldset>

        {/* Honeypot: invisible to people, tempting to bots. */}
        <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px]">
          <label htmlFor="website">No completar</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="mt-5 space-y-3 rounded-card border border-border p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="acceptedTerms"
              required
              className="mt-0.5 size-4 shrink-0 rounded border-stone-400 text-violet-700 focus:ring-2 focus:ring-violet-600"
            />
            <span className="text-[0.8125rem] leading-relaxed text-foreground">
              Acepto los{' '}
              <Link href={ROUTES.terms} className="font-medium text-violet-700 underline" target="_blank">
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link href={ROUTES.cancellation} className="font-medium text-violet-700 underline" target="_blank">
                política de cancelación
              </Link>
              . <span className="text-[#9b3232]">*</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="marketingOptIn"
              className="mt-0.5 size-4 shrink-0 rounded border-stone-400 text-violet-700 focus:ring-2 focus:ring-violet-600"
            />
            <span className="text-[0.8125rem] leading-relaxed text-foreground">
              Quiero recibir novedades y ofertas de Vamos Calafate.
            </span>
          </label>
        </div>
      </div>

      {/* ── Summary ─────────────────────────────────────────────────── */}
      <aside className="mt-8 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
        <div className="rounded-card border border-border bg-surface-muted p-5">
          <h2 className="font-display text-base font-semibold text-heading">Tu reserva</h2>

          <dl className="mt-4 space-y-2.5 border-b border-border pb-4 text-[0.8125rem]">
            <Row label="Experiencia" value={tour.name} />
            <Row label="Opción" value={option.name} />
            <Row label="Fecha" value={formatDate(selection.date)} />
            {selection.departureTime ? <Row label="Horario" value={selection.departureTime} /> : null}
            <Row
              label="Pasajeros"
              value={`${selection.adults} ${selection.adults === 1 ? 'adulto' : 'adultos'}${selection.children ? ` · ${selection.children} menores` : ''}`}
            />
            {pickup ? <Row label="Encuentro" value={pickup.name} /> : null}
          </dl>

          <dl className="mt-4 space-y-2 text-[0.8125rem]">
            <div className="flex justify-between text-muted-foreground">
              <dt>
                {selection.adults} × {formatMoney(breakdown.adultUnitCents, breakdown.currency)}
              </dt>
              <dd>{formatMoney(breakdown.adultsSubtotalCents, breakdown.currency)}</dd>
            </div>

            {selection.children > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <dt>
                  {selection.children} menores × {formatMoney(breakdown.childUnitCents, breakdown.currency)}
                </dt>
                <dd>{formatMoney(breakdown.childrenSubtotalCents, breakdown.currency)}</dd>
              </div>
            ) : null}

            {pickupCost > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <dt>Punto de encuentro</dt>
                <dd>{formatMoney(pickupCost, breakdown.currency)}</dd>
              </div>
            ) : null}

            <div className="flex justify-between border-t border-border pt-3 font-display text-base font-bold text-heading">
              <dt>Total</dt>
              <dd>{formatMoney(displayTotal, breakdown.currency)}</dd>
            </div>
          </dl>

          {seatsAvailable !== null && seatsAvailable <= 6 ? (
            <p className="mt-3 rounded-control bg-[#fbf4e6] px-3 py-2 text-xs text-[#8a6014]">
              Quedan {seatsAvailable} lugares para esta salida.
            </p>
          ) : null}

          <Button type="submit" fullWidth size="lg" className="mt-5" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creando reserva…
              </>
            ) : (
              'Continuar al pago'
            )}
          </Button>

          <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-plum-500">
            Todavía no se realiza ningún cargo. En el siguiente paso elegís el medio de pago.
          </p>

          {option.freeCancellationHours > 0 ? (
            <p className="mt-2 text-center text-[0.6875rem] text-[#2f6f4f]">
              Cancelación sin cargo hasta {option.freeCancellationHours} h antes
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs">
          <Link href={tour.detailPath} className="text-plum-500 underline underline-offset-2 hover:text-foreground">
            Modificar la selección
          </Link>
        </p>
      </aside>
    </form>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-plum-500">{label}</dt>
      <dd className="text-right font-medium text-heading">{value}</dd>
    </div>
  )
}

function Field({
  name,
  label,
  type = 'text',
  required,
  errors,
  hint,
  autoComplete,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  errors: FieldErrors
  hint?: string
  autoComplete?: string
}) {
  const fieldErrors = errors[name]
  const errorId = `${name}-error`
  const hintId = `${name}-hint`

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
        {label}
        {required ? <span className="ml-0.5 text-[#9b3232]">*</span> : null}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={fieldErrors ? true : undefined}
        aria-describedby={cn(hint && hintId, fieldErrors && errorId) || undefined}
        className={cn(
          'w-full rounded-control border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-1',
          fieldErrors
            ? 'border-[#9b3232] focus:border-[#9b3232] focus:ring-[#9b3232]'
            : 'border-border-strong focus:border-violet-600 focus:ring-violet-600',
        )}
      />

      {hint && !fieldErrors ? (
        <p id={hintId} className="mt-1 text-[0.6875rem] text-plum-500">
          {hint}
        </p>
      ) : null}

      {fieldErrors ? (
        <p id={errorId} role="alert" className="mt-1 text-[0.6875rem] text-[#9b3232]">
          {fieldErrors[0]}
        </p>
      ) : null}
    </div>
  )
}
