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
import { Select } from '@/components/ui/Select'

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

/** One traveller card per seat, labelled with the band it was booked under. */
type PassengerSlot = { key: string; tierLabel: string }

export function BookingForm({
  tour,
  option,
  selection,
  pickupLocations,
  breakdown,
  seatsAvailable,
  attribution,
  ageLimits,
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
    tiers: { tierId: string; quantity: number }[]
    extras: { extraId: string; quantity: number }[]
    pickupLocationId: string | null
  }
  pickupLocations: { id: string; name: string; extraCostCents: number }[]
  breakdown: PriceBreakdown
  seatsAvailable: number | null
  attribution: Record<string, string>
  ageLimits: { min: number | null; max: number | null }
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [pickupId, setPickupId] = useState(selection.pickupLocationId ?? '')

  // The server-priced breakdown is the source of truth for who travels.
  const slots: PassengerSlot[] = breakdown.tiers.flatMap((tier) =>
    Array.from({ length: tier.quantity }, (_, index) => ({
      key: `${tier.id}-${index}`,
      tierLabel: tier.label,
    })),
  )

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})

    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '').trim()

    const passengers = slots.map((slot, index) => ({
      firstName: field(`passengers.${index}.firstName`),
      lastName: field(`passengers.${index}.lastName`),
      nationality: field(`passengers.${index}.nationality`),
      documentNumber: field(`passengers.${index}.documentNumber`),
      birthDate: field(`passengers.${index}.birthDate`),
      tierLabel: slot.tierLabel,
      type: 'ADULT' as const,
    }))

    // The first traveller is the lead: their name and nationality identify
    // the booking, so they are not asked for twice.
    const lead = passengers[0]

    const payload = {
      selection: {
        tourId: tour.id,
        optionId: option.id,
        date: selection.date,
        departureTime: selection.departureTime,
        tiers: selection.tiers,
        extras: selection.extras,
        pickupLocationId: pickupId || null,
      },
      customer: {
        firstName: lead?.firstName ?? '',
        lastName: lead?.lastName ?? '',
        email: field('customer.email'),
        phone: field('customer.phone'),
        country: lead?.nationality ?? '',
        hotelName: field('customer.hotelName'),
        specialRequests: field('customer.specialRequests'),
        marketingOptIn: form.get('marketingOptIn') === 'on',
      },
      passengers,
      attribution: {
        utmSource: attribution.utm_source,
        utmMedium: attribution.utm_medium,
        utmCampaign: attribution.utm_campaign,
        utmTerm: attribution.utm_term,
        utmContent: attribution.utm_content,
      },
      website: field('website'),
      acceptedTerms: form.get('acceptedTerms') === 'on',
    }

    const result = await createBookingAction(payload)

    if (!result.ok) {
      setFormError(result.message)
      // Customer name/nationality errors belong to the lead traveller's card.
      if (result.fieldErrors) {
        const mapped: FieldErrors = {}
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          const target =
            key === 'customer.firstName'
              ? 'passengers.0.firstName'
              : key === 'customer.lastName'
                ? 'passengers.0.lastName'
                : key === 'customer.country'
                  ? 'passengers.0.nationality'
                  : key
          mapped[target] = messages
        }
        setFieldErrors(mapped)
      }
      setSubmitting(false)
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
          quantity: breakdown.passengers,
        },
      ],
      result.data.totalCents / 100,
      result.data.currency,
    )

    router.push(`${ROUTES.checkout}?ref=${encodeURIComponent(result.data.reference)}`)
  }

  const pickup = pickupLocations.find((p) => p.id === pickupId)
  const pickupCost = (pickup?.extraCostCents ?? 0) * breakdown.passengers
  const displayTotal = breakdown.tiersSubtotalCents + breakdown.extrasCostCents + pickupCost

  const ageNote =
    ageLimits.min != null && ageLimits.max != null
      ? `Esta excursión es solo para personas de ${ageLimits.min} a ${ageLimits.max} años en la fecha del viaje.`
      : ageLimits.min != null
        ? `Edad mínima: ${ageLimits.min} años en la fecha del viaje.`
        : ageLimits.max != null
          ? `Edad máxima: ${ageLimits.max} años en la fecha del viaje.`
          : null

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
      <div className="min-w-0 space-y-6">
        {formError ? (
          <div
            id="booking-error"
            role="alert"
            tabIndex={-1}
            className="flex gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            <p className="text-sm text-danger">{formError}</p>
          </div>
        ) : null}

        {/* ── Contact ───────────────────────────────────────────────── */}
        <section className="rounded-[1.25rem] border border-border bg-surface p-5 shadow-subtle sm:p-6">
          <SectionTitle step={1} title="Datos de contacto" hint="A dónde te enviamos la confirmación y cómo te contactamos el día anterior." />

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field name="customer.email" label="Email" type="email" required errors={fieldErrors} autoComplete="email" />
            <Field
              name="customer.phone"
              label="WhatsApp"
              type="tel"
              required
              errors={fieldErrors}
              autoComplete="tel"
              placeholder="+54 9 2966 …"
              hint="Con código de país. Por acá confirmamos horarios."
            />
            <div className="sm:col-span-2">
              <Field
                name="customer.hotelName"
                label="Hotel o alojamiento en El Calafate"
                required
                errors={fieldErrors}
                hint="Para la búsqueda y la confirmación. Si todavía no lo sabés, escribí «A confirmar»."
              />
            </div>
          </div>

          {pickupLocations.length > 0 ? (
            <div className="mt-5">
              <label htmlFor="pickup" className="mb-2 block text-[0.8125rem] font-semibold text-heading">
                Punto de encuentro
              </label>
              <Select
                id="pickup"
                value={pickupId}
                onChange={setPickupId}
                options={[
                  { value: '', label: 'Coordinar por email', description: 'Te escribimos para acordar dónde buscarte.' },
                  ...pickupLocations.map((location) => ({
                    value: location.id,
                    label: location.name,
                    meta:
                      location.extraCostCents > 0
                        ? `+${formatMoney(location.extraCostCents, tour.currency)} p/persona`
                        : 'Sin cargo',
                  })),
                ]}
              />
            </div>
          ) : null}
        </section>

        {/* ── Travellers ────────────────────────────────────────────── */}
        <section className="rounded-[1.25rem] border border-border bg-surface p-5 shadow-subtle sm:p-6">
          <SectionTitle
            step={2}
            title={slots.length === 1 ? 'Datos del pasajero' : `Datos de los ${slots.length} pasajeros`}
            hint="Los operadores los necesitan para el ingreso al Parque Nacional. Tal como figuran en el documento."
          />
          {ageNote ? (
            <p className="mt-4 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[0.8125rem] text-warning">
              {ageNote}
            </p>
          ) : null}

          <ol className="mt-5 space-y-4">
            {slots.map((slot, index) => (
              <li key={slot.key} className="rounded-2xl border border-border bg-surface-muted p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2.5 text-sm font-bold text-heading">
                    <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-magenta-500 text-xs text-white">
                      {index + 1}
                    </span>
                    Pasajero {index + 1}
                    {index === 0 ? <span className="font-medium text-muted-foreground">· titular de la reserva</span> : null}
                  </p>
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                    {slot.tierLabel}
                  </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field name={`passengers.${index}.firstName`} label="Nombre" required errors={fieldErrors} autoComplete={index === 0 ? 'given-name' : 'off'} />
                  <Field name={`passengers.${index}.lastName`} label="Apellido" required errors={fieldErrors} autoComplete={index === 0 ? 'family-name' : 'off'} />
                  <Field name={`passengers.${index}.nationality`} label="Nacionalidad" required errors={fieldErrors} placeholder="Argentina" />
                  <Field name={`passengers.${index}.documentNumber`} label="DNI o pasaporte" required errors={fieldErrors} />
                  <BirthDateField name={`passengers.${index}.birthDate`} errors={fieldErrors} />
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Notes ─────────────────────────────────────────────────── */}
        <section className="rounded-[1.25rem] border border-border bg-surface p-5 shadow-subtle sm:p-6">
          <SectionTitle step={3} title="Comentarios" hint="Opcional." />
          <textarea
            id="customer.specialRequests"
            name="customer.specialRequests"
            rows={3}
            maxLength={1000}
            placeholder="Restricciones alimentarias, movilidad reducida, viajás con bebés…"
            className="form-control mt-4"
            aria-label="Comentarios"
          />
        </section>

        {/* Honeypot: invisible to people, tempting to bots. */}
        <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px]">
          <label htmlFor="website">No completar</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="space-y-3 rounded-[1.25rem] border border-border bg-surface p-5 shadow-subtle">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="acceptedTerms"
              required
              className="mt-0.5 size-4 shrink-0 rounded border-border-strong text-primary focus:ring-2 focus:ring-primary"
            />
            <span className="text-[0.8125rem] leading-relaxed text-foreground">
              Acepto los{' '}
              <Link href={ROUTES.terms} className="font-medium text-primary underline" target="_blank">
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link href={ROUTES.cancellation} className="font-medium text-primary underline" target="_blank">
                política de cancelación
              </Link>
              . <span className="text-danger" aria-hidden="true">*</span>
            </span>
          </label>
          {fieldErrors.acceptedTerms ? (
            <p role="alert" className="text-xs text-danger">{fieldErrors.acceptedTerms[0]}</p>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="marketingOptIn"
              className="mt-0.5 size-4 shrink-0 rounded border-border-strong text-primary focus:ring-2 focus:ring-primary"
            />
            <span className="text-[0.8125rem] leading-relaxed text-foreground">
              Quiero recibir novedades y ofertas de Vamos Calafate.
            </span>
          </label>
        </div>
      </div>

      {/* ── Summary ─────────────────────────────────────────────────── */}
      <aside className="mt-8 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
        <div className="overflow-hidden rounded-[1.25rem] border border-magenta-500/30 bg-surface shadow-float">
          <div className="bg-aurora px-5 py-4 text-white">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-violet-300">Tu reserva</p>
            <p className="mt-1 font-display text-lg font-semibold leading-snug">{tour.name}</p>
          </div>

          <div className="p-5">
            <dl className="space-y-2.5 border-b border-border pb-4 text-[0.8125rem]">
              <Row label="Opción" value={option.name} />
              <Row label="Fecha" value={formatDate(selection.date)} />
              {selection.departureTime ? <Row label="Horario" value={selection.departureTime} /> : null}
              <Row label="Pasajeros" value={String(breakdown.passengers)} />
              {pickup ? <Row label="Encuentro" value={pickup.name} /> : null}
            </dl>

            <dl className="mt-4 space-y-2 text-[0.8125rem]">
              {breakdown.tiers.map((line) => (
                <div key={line.id} className="flex justify-between gap-3 text-muted-foreground">
                  <dt>
                    {line.quantity} × {line.label}
                  </dt>
                  <dd className="shrink-0">
                    {line.unitCents === 0 ? 'Gratis' : formatMoney(line.subtotalCents, breakdown.currency)}
                  </dd>
                </div>
              ))}
              {breakdown.extras.map((line) => (
                <div key={line.id} className="flex justify-between gap-3 text-muted-foreground">
                  <dt>
                    {line.label}
                    {line.quantity > 1 ? ` × ${line.quantity}` : ''}
                  </dt>
                  <dd className="shrink-0">{formatMoney(line.subtotalCents, breakdown.currency)}</dd>
                </div>
              ))}
              {pickupCost > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <dt>Punto de encuentro</dt>
                  <dd>{formatMoney(pickupCost, breakdown.currency)}</dd>
                </div>
              ) : null}

              <div className="flex items-baseline justify-between border-t border-border pt-3 font-bold text-heading">
                <dt>Total</dt>
                <dd className="font-display text-xl">{formatMoney(displayTotal, breakdown.currency)}</dd>
              </div>
            </dl>

            {seatsAvailable !== null && seatsAvailable <= 6 ? (
              <p className="mt-3 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
                Quedan {seatsAvailable} lugares para esta salida.
              </p>
            ) : null}

            <Button type="submit" fullWidth size="lg" variant="accent" className="mt-5" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Creando reserva…
                </>
              ) : (
                'Continuar al pago'
              )}
            </Button>

            <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-muted-foreground">
              Todavía no se realiza ningún cargo. En el siguiente paso elegís el medio de pago.
            </p>

            {option.freeCancellationHours > 0 ? (
              <p className="mt-2 text-center text-[0.6875rem] text-success">
                Cancelación sin cargo hasta {option.freeCancellationHours} h antes
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-center text-xs">
          <Link href={tour.detailPath} className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Modificar la selección
          </Link>
        </p>
      </aside>
    </form>
  )
}

function SectionTitle({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-plum-950 text-sm font-bold text-white dark:bg-violet-700">
        {step}
      </span>
      <div>
        <h2 className="font-display text-lg font-semibold leading-tight text-heading">{title}</h2>
        {hint ? <p className="mt-1 text-[0.8125rem] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  )
}

/**
 * Date of birth as DD/MM/AAAA, typed rather than picked: a calendar is the
 * wrong tool for a date decades back, and typing six digits is fastest. The
 * slashes are inserted automatically; a hidden input carries the ISO value.
 */
function BirthDateField({ name, errors }: { name: string; errors: FieldErrors }) {
  const [text, setText] = useState('')
  const digits = text.replace(/\D/g, '')
  const iso =
    digits.length === 8 ? `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}` : ''
  const fieldErrors = errors[name]
  const id = `${name}-display`

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
        Fecha de nacimiento<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
      </label>
      <input type="hidden" name={name} value={iso} />
      <input
        id={id}
        inputMode="numeric"
        autoComplete="bday"
        placeholder="DD/MM/AAAA"
        value={text}
        maxLength={10}
        onChange={(event) => {
          const raw = event.target.value.replace(/\D/g, '').slice(0, 8)
          const parts = [raw.slice(0, 2), raw.slice(2, 4), raw.slice(4, 8)].filter(Boolean)
          setText(parts.join('/'))
        }}
        aria-invalid={fieldErrors ? true : undefined}
        aria-describedby={fieldErrors ? `${name}-error` : undefined}
        className="form-control tabular-nums"
      />
      {fieldErrors ? (
        <p id={`${name}-error`} role="alert" className="mt-1 text-[0.6875rem] text-danger">
          {fieldErrors[0]}
        </p>
      ) : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
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
  placeholder,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  errors: FieldErrors
  hint?: string
  autoComplete?: string
  placeholder?: string
}) {
  const fieldErrors = errors[name]
  const errorId = `${name}-error`
  const hintId = `${name}-hint`

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
        {label}
        {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={fieldErrors ? true : undefined}
        aria-describedby={cn(hint && hintId, fieldErrors && errorId) || undefined}
        className="form-control"
      />

      {hint && !fieldErrors ? (
        <p id={hintId} className="mt-1 text-[0.6875rem] text-muted-foreground">
          {hint}
        </p>
      ) : null}

      {fieldErrors ? (
        <p id={errorId} role="alert" className="mt-1 text-[0.6875rem] text-danger">
          {fieldErrors[0]}
        </p>
      ) : null}
    </div>
  )
}
