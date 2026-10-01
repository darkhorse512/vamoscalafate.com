import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import { CONTACT, LOCATION, ROUTES, SITE } from '@vamos/shared'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import { FOOTER_NAV } from './navigation'

/**
 * Footer.
 *
 * Carries the site's deepest internal linking layer: every major section is
 * reachable from every page, which is what gives a content site a shallow
 * crawl depth without resorting to a link dump.
 */
export function Footer({ flush = false }: { flush?: boolean } = {}) {
  const year = new Date().getFullYear()

  return (
    // `flush` drops the top margin when the page already ends in a full-bleed
    // band, which would otherwise leave a white strip above the footer.
    <footer className={`${flush ? '' : 'mt-24 '}border-t border-plum-800 bg-inverse text-stone-300`}>
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2.6fr)]">
          <div>
            <Logo tone="light" />

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-stone-400">
              Excursiones, traslados y experiencias en El Calafate, Santa Cruz. Reserva online y
              guía práctica para viajar por la Patagonia argentina.
            </p>

            <address className="mt-6 space-y-2.5 text-sm not-italic text-stone-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-violet-400" aria-hidden="true" />
                <span>
                  {LOCATION.city}, {LOCATION.province}, {LOCATION.country}
                </span>
              </div>

              {CONTACT.phone ? (
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-violet-400" aria-hidden="true" />
                  <a href={`tel:${CONTACT.phone}`} className="transition-colors hover:text-white">
                    {CONTACT.phone}
                  </a>
                </div>
              ) : null}

              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-violet-400" aria-hidden="true" />
                <a href={`mailto:${CONTACT.email}`} className="transition-colors hover:text-white">
                  {CONTACT.email}
                </a>
              </div>
            </address>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_NAV.map((group) => (
              <nav key={group.title} aria-labelledby={`footer-${group.title}`}>
                <h2
                  id={`footer-${group.title}`}
                  className="font-sans text-[0.6875rem] font-bold uppercase tracking-[0.13em] text-white"
                >
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[0.8125rem] leading-snug text-stone-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-plum-800 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <p className="text-xs text-stone-400">
              © {year} {SITE.name}. Todos los derechos reservados.
            </p>
            {/* The header toggle is desktop-only; this is the mobile route to it. */}
            <ThemeToggle tone="over-media" className="self-start sm:hidden" />
          </div>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone-400">
            <li>
              <Link href={ROUTES.terms} className="transition-colors hover:text-stone-300">
                Términos
              </Link>
            </li>
            <li>
              <Link href={ROUTES.privacy} className="transition-colors hover:text-stone-300">
                Privacidad
              </Link>
            </li>
            <li>
              <Link href={ROUTES.cancellation} className="transition-colors hover:text-stone-300">
                Cancelaciones
              </Link>
            </li>
            <li>
              <Link href={ROUTES.cookies} className="transition-colors hover:text-stone-300">
                Cookies
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
