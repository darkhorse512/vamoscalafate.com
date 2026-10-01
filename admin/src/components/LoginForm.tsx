'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { loginAction, type LoginState } from '@/server/actions/auth'

/**
 * Login form.
 *
 * Built on `useActionState` over a real <form>, so it submits and works even
 * before hydration finishes. Autocomplete attributes are set correctly so
 * password managers behave.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, undefined)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h2 className="text-[0.9375rem] font-semibold text-heading">Iniciar sesión</h2>
        <p className="mt-1 text-[0.8125rem] text-subtle-foreground">
          Ingresá con tu cuenta de administración.
        </p>
      </div>

      {state?.error ? (
        <div
          role="alert"
          className="flex gap-2.5 rounded-control border-l-[3px] border-status-danger bg-status-dangerBg p-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-status-danger" aria-hidden="true" />
          <p className="text-[0.8125rem] text-status-danger">{state.error}</p>
        </div>
      ) : null}

      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label htmlFor="email" className="admin-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="admin-label">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="admin-input"
        />
      </div>

      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  // Reads the parent form's pending state, so the button disables during
  // submission without any extra state wiring.
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control bg-violet-700 text-[0.875rem] font-medium text-white transition-colors hover:bg-violet-800 disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Ingresando…
        </>
      ) : (
        'Ingresar'
      )}
    </button>
  )
}
