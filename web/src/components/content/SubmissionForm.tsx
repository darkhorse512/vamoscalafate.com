'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { Button } from '@/components/ui/Button'
import { analytics } from '@/lib/analytics'
import { submitHotelListingAction } from '@/server/actions/submission'
import { cn } from '@/lib/utils'

type FieldErrors = Record<string, string[]>

/**
 * Public listing request.
 *
 * Images and videos are collected as URLs rather than uploads: the applicant
 * is unauthenticated, and accepting arbitrary binary from an anonymous visitor
 * is a far larger attack surface than storing a string an admin will review.
 */
export function SubmissionForm() {
  const [state, setState] = useState<'idle' | 'submitting' | 'sent'>('idle')
  const [reference, setReference] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [kind, setKind] = useState<'HOTEL' | 'BUSINESS'>('HOTEL')
  const [imageUrls, setImageUrls] = useState<string[]>([''])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('submitting')
    setFormError(null)
    setFieldErrors({})

    const form = new FormData(event.currentTarget)

    const result = await submitHotelListingAction({
      kind,
      businessName: String(form.get('businessName') ?? ''),
      contactName: String(form.get('contactName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      website: String(form.get('website') ?? ''),
      address: String(form.get('address') ?? ''),
      description: String(form.get('description') ?? ''),
      amenities: String(form.get('amenities') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      services: String(form.get('services') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      openingHours: String(form.get('openingHours') ?? ''),
      imageUrls: imageUrls.map((u) => u.trim()).filter(Boolean),
      videoUrls: String(form.get('videoUrls') ?? '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      extraInfo: String(form.get('extraInfo') ?? ''),
      website_hp: String(form.get('website_hp') ?? ''),
      acceptedTerms: form.get('acceptedTerms') === 'on',
    })

    if (!result.ok) {
      setFormError(result.message)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setState('idle')
      document.getElementById('submission-error')?.focus()
      return
    }

    analytics.hotelSubmission()
    setReference(result.data.reference)
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="rounded-card border border-border bg-surface-muted p-8 text-center"
      >
        <CheckCircle2 className="mx-auto size-11 text-success" aria-hidden="true" />
        <h2 className="mt-4 font-display text-xl font-semibold text-heading">
          Solicitud enviada
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Te enviamos un correo de confirmación. Guardá la referencia para cualquier consulta:
        </p>
        <p className="mt-4 inline-block rounded-control bg-surface px-4 py-2 font-mono text-base font-bold text-heading ring-1 ring-border-strong">
          {reference}
        </p>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
          Revisamos cada solicitud antes de publicarla. Si necesitamos información adicional, te
          escribimos a la dirección que indicaste.
        </p>
        <Link
          href={ROUTES.hotels}
          className="mt-6 inline-block text-sm font-semibold text-primary underline underline-offset-2"
        >
          Ver la guía de alojamientos
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="min-w-0">
      {formError ? (
        <div
          id="submission-error"
          role="alert"
          tabIndex={-1}
          className="mb-6 flex gap-3 rounded-card border-l-[3px] border-danger bg-danger-soft p-4"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm text-danger">{formError}</p>
        </div>
      ) : null}

      <fieldset className="rounded-card border border-border p-5 sm:p-6">
        <legend className="px-2 font-display text-base font-semibold text-heading">
          Tipo de establecimiento
        </legend>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {(
            [
              { value: 'HOTEL', label: 'Alojamiento', detail: 'Hotel, hostería, cabaña, hostel' },
              { value: 'BUSINESS', label: 'Comercio o servicio', detail: 'Restaurante, alquiler, agencia' },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-control border p-4 transition-colors',
                kind === option.value
                  ? 'border-violet-700 bg-primary-soft'
                  : 'border-border-strong hover:border-primary',
              )}
            >
              <input
                type="radio"
                name="kind"
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="mt-0.5 size-4 border-border-strong text-primary focus:ring-2 focus:ring-primary"
              />
              <span>
                <span className="block text-sm font-semibold text-heading">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5 rounded-card border border-border p-5 sm:p-6">
        <legend className="px-2 font-display text-base font-semibold text-heading">
          Datos del establecimiento
        </legend>

        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <Field name="businessName" label="Nombre del establecimiento" required errors={fieldErrors} />
          <Field name="contactName" label="Persona de contacto" required errors={fieldErrors} />
          <Field name="email" label="Email" type="email" required errors={fieldErrors} />
          <Field name="phone" label="Teléfono" type="tel" required errors={fieldErrors} />
          <Field name="website" label="Sitio web" type="url" errors={fieldErrors} hint="Opcional. Con https://" />
          <Field name="address" label="Dirección" errors={fieldErrors} />
        </div>

        <div className="mt-5">
          <label htmlFor="description" className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
            Descripción<span className="ml-0.5 text-danger">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            required
            minLength={50}
            maxLength={5000}
            placeholder="Contanos qué ofrece tu establecimiento, su ubicación, capacidad y lo que lo distingue. Mínimo 50 caracteres."
            aria-invalid={fieldErrors.description ? true : undefined}
            className={cn(
              'w-full rounded-control border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-1',
              fieldErrors.description
                ? 'border-danger focus:ring-danger'
                : 'border-border-strong focus:border-primary focus:ring-primary',
            )}
          />
          {fieldErrors.description ? (
            <p role="alert" className="mt-1 text-[0.6875rem] text-danger">
              {fieldErrors.description[0]}
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field
            name={kind === 'HOTEL' ? 'amenities' : 'services'}
            label={kind === 'HOTEL' ? 'Servicios' : 'Qué ofrecés'}
            errors={fieldErrors}
            hint="Separados por comas. Ej: WiFi, desayuno, estacionamiento"
          />
          <Field
            name="openingHours"
            label="Horarios de atención"
            errors={fieldErrors}
            hint="Ej: Lunes a sábado 9 a 20 h"
          />
        </div>
      </fieldset>

      <fieldset className="mt-5 rounded-card border border-border p-5 sm:p-6">
        <legend className="px-2 font-display text-base font-semibold text-heading">
          Imágenes y video
        </legend>

        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Indicá enlaces a imágenes alojadas en tu sitio o en un servicio de almacenamiento. No
          subimos archivos desde este formulario.
        </p>

        <div className="mt-4 space-y-2.5">
          {imageUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <label htmlFor={`image-${index}`} className="sr-only">
                URL de imagen {index + 1}
              </label>
              <input
                id={`image-${index}`}
                type="url"
                value={url}
                onChange={(event) => {
                  const next = [...imageUrls]
                  next[index] = event.target.value
                  setImageUrls(next)
                }}
                placeholder="https://…"
                className="h-11 flex-1 rounded-control border border-border-strong bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {imageUrls.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== index))}
                  aria-label={`Quitar imagen ${index + 1}`}
                  className="grid size-11 shrink-0 place-items-center rounded-control border border-border-strong text-muted-foreground hover:bg-surface-muted"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}

          {imageUrls.length < 12 ? (
            <button
              type="button"
              onClick={() => setImageUrls([...imageUrls, ''])}
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-primary hover:text-primary-hover"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Agregar otra imagen
            </button>
          ) : null}
        </div>

        <div className="mt-5">
          <label htmlFor="videoUrls" className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
            Videos
          </label>
          <textarea
            id="videoUrls"
            name="videoUrls"
            rows={2}
            placeholder="Enlaces de YouTube o Vimeo, uno por línea"
            className="w-full rounded-control border border-border-strong bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="mt-5">
          <label htmlFor="extraInfo" className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
            Información adicional
          </label>
          <textarea
            id="extraInfo"
            name="extraInfo"
            rows={3}
            maxLength={2000}
            placeholder="Cualquier otro dato que quieras que tengamos en cuenta."
            className="w-full rounded-control border border-border-strong bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </fieldset>

      {/* Honeypot */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px]">
        <label htmlFor="s-website">No completar</label>
        <input id="s-website" name="website_hp" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="acceptedTerms"
          required
          className="mt-0.5 size-4 shrink-0 rounded border-border-strong text-primary focus:ring-2 focus:ring-primary"
        />
        <span className="text-[0.8125rem] leading-relaxed text-foreground">
          Declaro que la información es veraz, que tengo autorización para representar al
          establecimiento y acepto la{' '}
          <Link href={ROUTES.privacy} className="font-medium text-primary underline" target="_blank">
            política de privacidad
          </Link>
          .<span className="ml-0.5 text-danger">*</span>
        </span>
      </label>

      <Button type="submit" size="lg" className="mt-6" disabled={state === 'submitting'}>
        {state === 'submitting' ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Enviando solicitud…
          </>
        ) : (
          'Enviar solicitud'
        )}
      </Button>
    </form>
  )
}

function Field({
  name,
  label,
  type = 'text',
  required,
  errors,
  hint,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  errors: FieldErrors
  hint?: string
}) {
  const fieldErrors = errors[name]

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[0.8125rem] font-semibold text-heading">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        aria-invalid={fieldErrors ? true : undefined}
        className={cn(
          'w-full rounded-control border bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-1',
          fieldErrors
            ? 'border-danger focus:ring-danger'
            : 'border-border-strong focus:border-primary focus:ring-primary',
        )}
      />
      {hint && !fieldErrors ? <p className="mt-1 text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
      {fieldErrors ? (
        <p role="alert" className="mt-1 text-[0.6875rem] text-danger">
          {fieldErrors[0]}
        </p>
      ) : null}
    </div>
  )
}
