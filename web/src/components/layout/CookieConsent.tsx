'use client'

import Link from 'next/link'
import { ROUTES } from '@vamos/shared'
import { Button } from '@/components/ui/Button'
import { setConsent, useConsent } from '@/lib/use-consent'

/**
 * Cookie consent banner.
 *
 * Opt-in, not opt-out: nothing beyond strictly necessary storage is used until
 * the visitor accepts. Declining is a single click with the same visual weight
 * as accepting — a "reject" button hidden behind a settings dialog is a dark
 * pattern, not consent.
 *
 * Rendered only after mount so the server HTML and the first client render
 * match, avoiding a hydration mismatch.
 */
export function CookieConsent() {
  const consent = useConsent()

  // `null` means "not yet decided". The server snapshot is also null, so the
  // banner is absent from the server HTML and appears on hydration — which
  // keeps the two renders in agreement.
  if (consent !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Preferencias de cookies"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-2xl rounded-card border border-stone-200 bg-white p-4 shadow-float sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-[0.8125rem] leading-relaxed text-lenga-700">
          Usamos cookies necesarias para que el sitio funcione y, con tu permiso, cookies
          analíticas para entender cómo se usa.{' '}
          <Link
            href={ROUTES.cookies}
            className="font-medium text-glacier-700 underline underline-offset-2 hover:text-glacier-900"
          >
            Más información
          </Link>
          .
        </p>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setConsent('denied')}>
            Rechazar
          </Button>
          <Button size="sm" onClick={() => setConsent('granted')}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}
