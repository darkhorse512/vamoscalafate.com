import Image from 'next/image'
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
          <Image
            src="/brand/logo-light.png"
            alt="Vamos Calafate"
            width={646}
            height={192}
            unoptimized
            priority
            className="mx-auto h-16 w-auto"
          />
          <h1 className="mt-5 text-base font-semibold text-white">Panel de administración</h1>
        </div>

        <div className="rounded-panel bg-surface p-6 shadow-panel">
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-[0.6875rem] leading-relaxed text-subtle-foreground">
          El acceso a este panel queda registrado. Si no sos parte del equipo de Vamos Calafate,
          cerrá esta página.
        </p>
      </div>
    </div>
  )
}
