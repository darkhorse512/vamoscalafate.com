'use client'

import Link from 'next/link'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Root error boundary.
 *
 * Shows a friendly message and never the error text: a stack trace or a
 * database message in the browser is an information-disclosure bug. The real
 * error is already captured in the server log.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // `digest` is the server-side correlation id — safe to show, and it lets
    // support find the matching log line.
    console.error('Unhandled application error', { digest: error.digest })
  }, [error])

  return (
    <div className="container-page py-24 text-center">
      <AlertTriangle className="mx-auto size-12 text-[#8a6014]" aria-hidden="true" />

      <h1 className="mt-6 font-display text-2xl font-bold text-lenga-950">
        Algo salió mal
      </h1>

      <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-lenga-600">
        Tuvimos un problema al cargar esta página. Ya quedó registrado. Probá de nuevo en unos
        segundos.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-control bg-glacier-700 px-5 text-sm font-semibold text-white hover:bg-glacier-800"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-control border border-stone-300 px-5 text-sm font-semibold text-lenga-900 hover:bg-stone-50"
        >
          Volver al inicio
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-8 font-mono text-xs text-lenga-400">Referencia: {error.digest}</p>
      ) : null}
    </div>
  )
}
