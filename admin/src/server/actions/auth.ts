'use server'

import { redirect } from 'next/navigation'
import { login, logout } from '../auth'

/**
 * Authentication server actions.
 *
 * `redirect()` throws a control-flow signal, so it must run outside any
 * try/catch that would swallow it.
 */

export type LoginState = { error?: string } | undefined

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const result = await login({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })

  if (!result.ok) return { error: result.message }

  /**
   * Only a same-origin PATH is accepted as a post-login destination. Taking an
   * absolute URL here would turn the login form into an open redirect that
   * phishing could use against administrators.
   */
  const requested = String(formData.get('next') ?? '')
  const safeNext =
    requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard'

  redirect(safeNext)
}

export async function logoutAction(): Promise<void> {
  await logout()
  redirect('/login')
}
