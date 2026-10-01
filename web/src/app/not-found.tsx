import Link from 'next/link'
import { Compass } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'

export const metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="contenido" className="pt-(--header-height)">
        <div className="container-page py-20 text-center sm:py-28">
          <Compass className="mx-auto size-12 text-primary" aria-hidden="true" />

          <h1 className="mt-6 font-display text-display-sm font-bold text-heading">
            No encontramos esta página
          </h1>

          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted-foreground">
            El enlace puede haber cambiado o la página ya no existe. Estos son algunos puntos de
            partida.
          </p>

          <ul className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {[
              { href: ROUTES.tours, label: 'Excursiones', detail: 'Todo el catálogo' },
              { href: ROUTES.mustSee, label: '3 imperdibles', detail: 'Lo que no te podés perder' },
              { href: ROUTES.blog, label: 'Guía de viaje', detail: 'Artículos prácticos' },
              { href: ROUTES.contact, label: 'Contacto', detail: 'Hacenos una consulta' },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-card border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-surface-muted"
                >
                  <span className="block text-[0.9375rem] font-semibold text-heading">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{link.detail}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  )
}
