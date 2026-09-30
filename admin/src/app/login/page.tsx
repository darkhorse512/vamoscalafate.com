import type { Metadata } from 'next'
import { LoginForm } from '@/components/LoginForm'

export const metadata: Metadata = {
  title: 'Iniciar sesión',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = typeof params.next === 'string' ? params.next : undefined

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <span
            className="mx-auto grid size-11 place-items-center rounded-lg bg-glacier-600"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none">
              <path d="M2 16.5 L7 8 L11 13 L15.5 5.5 L22 16.5 Z" fill="#ffffff" />
              <path d="M2 17.8 h20 v1.6 H2 Z" fill="#ffffff" opacity="0.7" />
            </svg>
          </span>
          <h1 className="mt-4 text-lg font-semibold text-white">Vamos Calafate</h1>
          <p className="mt-1 text-[0.8125rem] text-slate-400">
            Panel de administración
          </p>
        </div>

        <div className="rounded-panel bg-white p-6 shadow-panel">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-[0.6875rem] leading-relaxed text-slate-500">
          El acceso a este panel queda registrado. Si no sos parte del equipo de Vamos Calafate,
          cerrá esta página.
        </p>
      </div>
    </div>
  )
}
