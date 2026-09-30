'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, Search as SearchIcon, X } from 'lucide-react'
import { CONTACT, ROUTES, whatsappUrl } from '@vamos/shared'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV } from './navigation'

/**
 * Mobile navigation drawer.
 *
 * Booking on a phone is the primary conversion path, so this is a full dialog
 * rather than a cramped dropdown. It implements the accessibility contract a
 * modal owes: focus moves in on open, is trapped while open, Escape closes,
 * background scroll is locked, and focus returns to the trigger on close.
 */
export function MobileNav({ tone }: { tone: 'dark' | 'light' }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the dialog so the next Tab lands inside it.
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled])',
    )
    firstFocusable?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const whatsapp = whatsappUrl('Hola, quiero consultar por una excursión en El Calafate.')

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={open}
        className={cn(
          'grid size-10 place-items-center rounded-control transition-colors lg:hidden',
          tone === 'dark' ? 'text-lenga-800 hover:bg-stone-100' : 'text-white hover:bg-white/10',
        )}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-lenga-950/55 backdrop-blur-[2px]"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute inset-y-0 right-0 flex w-full max-w-[22rem] flex-col bg-white shadow-float"
          >
            <div className="flex h-(--header-height) shrink-0 items-center justify-between border-b border-stone-200 px-5">
              <span className="font-display text-base font-bold text-lenga-950">Menú</span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
                aria-label="Cerrar menú"
                className="grid size-10 place-items-center rounded-control text-lenga-700 hover:bg-stone-100"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Navegación móvil" className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              <Link
                href={ROUTES.search}
                className="mb-3 flex items-center gap-2.5 rounded-control border border-stone-200 bg-stone-50 px-3.5 py-3 text-sm text-lenga-500"
              >
                <SearchIcon className="size-4" aria-hidden="true" />
                Buscar excursiones, hoteles, artículos…
              </Link>

              <ul className="space-y-0.5">
                {PRIMARY_NAV.map((item) => {
                  const isExpanded = expanded === item.label
                  return (
                    <li key={item.label}>
                      <div className="flex items-stretch">
                        <Link
                          href={item.href}
                          className="flex-1 rounded-control px-3.5 py-3 text-[0.9375rem] font-semibold text-lenga-900 hover:bg-stone-50"
                        >
                          {item.label}
                        </Link>
                        {item.children ? (
                          <button
                            type="button"
                            onClick={() => setExpanded(isExpanded ? null : item.label)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${item.label}`}
                            className="grid w-11 shrink-0 place-items-center rounded-control text-lenga-500 hover:bg-stone-50"
                          >
                            <ChevronDown
                              className={cn('size-4 transition-transform', isExpanded && 'rotate-180')}
                              aria-hidden="true"
                            />
                          </button>
                        ) : null}
                      </div>

                      {item.children && isExpanded ? (
                        <ul className="mb-1 ml-3.5 space-y-0.5 border-l border-stone-200 pl-3">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className="block rounded-control px-3 py-2.5 text-sm text-lenga-600 hover:bg-stone-50 hover:text-lenga-900"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="shrink-0 space-y-2 border-t border-stone-200 p-4">
              <ButtonLink href={ROUTES.tours} fullWidth size="md">
                Ver excursiones
              </ButtonLink>
              {whatsapp ? (
                <ButtonLink href={whatsapp} external fullWidth size="md" variant="outline">
                  Consultar por WhatsApp
                </ButtonLink>
              ) : (
                <ButtonLink href={ROUTES.contact} fullWidth size="md" variant="outline">
                  Contacto
                </ButtonLink>
              )}
              {CONTACT.email ? (
                <p className="pt-1 text-center text-xs text-lenga-500">{CONTACT.email}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
