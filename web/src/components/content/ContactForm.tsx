'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { Button } from '@/components/ui/Button'
import { analytics } from '@/lib/analytics'
import { submitContactAction } from '@/server/actions/contact'
import { cn } from '@/lib/utils'

type FieldErrors = Record<string, string[]>

/**
 * Contact form.
 *
 * On success the form is replaced by a confirmation rather than cleared, so
 * there is no ambiguity about whether the message was sent - and no way to
 * double-submit by pressing the button again.
 */
export function ContactForm({ tourSlug }: { tourSlug?: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'sent'>('idle')
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('submitting')
    setFormError(null)
    setFieldErrors({})

    const form = new FormData(event.currentTarget)
    const params = new URLSearchParams(window.location.search)

    const result = await submitContactAction({
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      subject: String(form.get('subject') ?? ''),
      message: String(form.get('message') ?? ''),
      tourSlug: tourSlug ?? '',
      utmSource: params.get('utm_source') ?? undefined,
      utmCampaign: params.get('utm_campaign') ?? undefined,
      website: String(form.get('website') ?? ''),
      acceptedPrivacy: form.get('acceptedPrivacy') === 'on',
    })

    if (!result.ok) {
      setFormError(result.message)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      setState('idle')
      document.getElementById('contact-error')?.focus()
      return
    }

    analytics.contact(String(form.get('subject') ?? ''))
    analytics.generateLead('contact_form')
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div
        role="status"
        className="rounded-card border border-stone-200 bg-stone-50 p-8 text-center"
      >
        <CheckCircle2 className="mx-auto size-11 text-[#2f6f4f]" aria-hidden="true" />
        <h2 className="mt-4 font-display text-xl font-semibold text-lenga-950">
          Recibimos tu consulta
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-lenga-600">
          Te enviamos una confirmación por correo. Respondemos de lunes a sábado, habitualmente
          dentro de las 24 horas.
        </p>
        <Link
          href={ROUTES.tours}
          className="mt-6 inline-block text-sm font-semibold text-glacier-700 underline underline-offset-2"
        >
          Mientras tanto, mirá las excursiones
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="min-w-0">
      {formError ? (
        <div
          id="contact-error"
          role="alert"
          tabIndex={-1}
          className="mb-6 flex gap-3 rounded-card border-l-[3px] border-[#9b3232] bg-[#fbeeee] p-4"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#9b3232]" aria-hidden="true" />
          <p className="text-sm text-[#9b3232]">{formError}</p>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Nombre y apellido" required errors={fieldErrors} autoComplete="name" />
        <Field name="email" label="Email" type="email" required errors={fieldErrors} autoComplete="email" />
        <Field name="phone" label="Teléfono" type="tel" errors={fieldErrors} autoComplete="tel" hint="Opcional" />
        <Field name="subject" label="Asunto" required errors={fieldErrors} />
      </div>

      <div className="mt-5">
        <label htmlFor="message" className="mb-1.5 block text-[0.8125rem] font-semibold text-lenga-900">
          Mensaje<span className="ml-0.5 text-[#9b3232]">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          maxLength={3000}
          aria-invalid={fieldErrors.message ? true : undefined}
          aria-describedby={fieldErrors.message ? 'message-error' : undefined}
          placeholder="Contanos qué necesitás: fechas, cantidad de personas, excursiones que te interesan…"
          className={cn(
            'w-full rounded-control border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-1',
            fieldErrors.message
              ? 'border-[#9b3232] focus:border-[#9b3232] focus:ring-[#9b3232]'
              : 'border-stone-300 focus:border-glacier-600 focus:ring-glacier-600',
          )}
        />
        {fieldErrors.message ? (
          <p id="message-error" role="alert" className="mt-1 text-[0.6875rem] text-[#9b3232]">
            {fieldErrors.message[0]}
          </p>
        ) : null}
      </div>

      {/* Honeypot */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px]">
        <label htmlFor="c-website">No completar</label>
        <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="acceptedPrivacy"
          required
          className="mt-0.5 size-4 shrink-0 rounded border-stone-400 text-glacier-700 focus:ring-2 focus:ring-glacier-600"
        />
        <span className="text-[0.8125rem] leading-relaxed text-lenga-700">
          Acepto la{' '}
          <Link href={ROUTES.privacy} className="font-medium text-glacier-700 underline" target="_blank">
            política de privacidad
          </Link>{' '}
          y el tratamiento de mis datos para responder esta consulta.
          <span className="ml-0.5 text-[#9b3232]">*</span>
        </span>
      </label>

      <Button type="submit" size="lg" className="mt-6" disabled={state === 'submitting'}>
        {state === 'submitting' ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Enviando…
          </>
        ) : (
          'Enviar consulta'
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

  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[0.8125rem] font-semibold text-lenga-900">
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
        aria-describedby={fieldErrors ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={cn(
          'w-full rounded-control border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-1',
          fieldErrors
            ? 'border-[#9b3232] focus:border-[#9b3232] focus:ring-[#9b3232]'
            : 'border-stone-300 focus:border-glacier-600 focus:ring-glacier-600',
        )}
      />
      {hint && !fieldErrors ? (
        <p id={`${name}-hint`} className="mt-1 text-[0.6875rem] text-lenga-500">
          {hint}
        </p>
      ) : null}
      {fieldErrors ? (
        <p id={`${name}-error`} role="alert" className="mt-1 text-[0.6875rem] text-[#9b3232]">
          {fieldErrors[0]}
        </p>
      ) : null}
    </div>
  )
}
