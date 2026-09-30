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
          <Compass className="mx-auto size-12 text-glacier-600" aria-hidden="true" />

          <h1 className="mt-6 font-display text-display-sm font-bold text-lenga-950">
            No encontramos esta página
          </h1>

          <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-lenga-600">
            El enlace puede haber cambiado o la página ya no existe. Estos son algunos puntos de
            partida.
          </p>

          <ul className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {[
              { href: ROUTES.tours, label: 'Excursiones', detail: 'Todo el catálogo' },
              { href: ROUTES.transfers, label: 'Traslados', detail: 'Aeropuerto y El Chaltén' },
              { href: ROUTES.blog, label: 'Guía de viaje', detail: 'Artículos prácticos' },
              { href: ROUTES.contact, label: 'Contacto', detail: 'Hacenos una consulta' },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-card border border-stone-200 p-4 text-left transition-colors hover:border-glacier-300 hover:bg-stone-50"
                >
                  <span className="block text-[0.9375rem] font-semibold text-lenga-950">
                    {link.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-lenga-500">{link.detail}</span>
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
