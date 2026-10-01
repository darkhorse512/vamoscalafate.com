'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search as SearchIcon } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { MobileNav } from './MobileNav'
import { ThemeToggle } from './ThemeToggle'
import { PRIMARY_NAV } from './navigation'

/**
 * Site header.
 *
 * Transparent over a hero and solid elsewhere, so the homepage image reads
 * full-bleed without costing legibility. The transparent state is only used
 * when the page actually has a dark hero behind it (`overHero`).
 *
 * The dropdown is keyboard-navigable: Escape closes it and returns focus to
 * the trigger, and focus leaving the group closes it too.
 */
export function Header({ overHero = false }: { overHero?: boolean }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!overHero) return
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overHero])

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const solid = !overHero || scrolled
  const tone = solid ? 'dark' : 'light'

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    // Short grace period so the pointer can cross the gap to the panel.
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140)
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 h-(--header-height) transition-colors duration-300',
        solid
          ? 'border-b border-border bg-white/95 backdrop-blur-sm'
          : 'bg-gradient-to-b from-plum-950/55 to-transparent',
      )}
    >
      <div className="container-page flex h-full items-center justify-between gap-6">
        <Logo tone={tone} />

        {/* Keyed on the pathname so an open dropdown cannot linger over the
            page the visitor just navigated to. */}
        <nav key={pathname} aria-label="Navegación principal" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {PRIMARY_NAV.map((item) => {
              const isOpen = openMenu === item.label
              const isActive = pathname.startsWith(item.href) && item.href !== '/'

              return (
                <li
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => {
                    cancelClose()
                    setOpenMenu(item.label)
                  }}
                  onMouseLeave={scheduleClose}
                  onFocus={() => setOpenMenu(item.label)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setOpenMenu(null)
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    aria-expanded={item.children ? isOpen : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-control px-3 py-2 text-[0.8125rem] font-semibold transition-colors',
                      solid
                        ? isActive
                          ? 'text-violet-800'
                          : 'text-foreground hover:bg-surface-strong hover:text-heading'
                        : 'text-white/90 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    {item.label}
                    {item.children ? (
                      <ChevronDown
                        className={cn('size-3.5 transition-transform', isOpen && 'rotate-180')}
                        aria-hidden="true"
                      />
                    ) : null}
                  </Link>

                  {item.children && isOpen ? (
                    <div
                      className="absolute left-0 top-full w-[19rem] pt-2"
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          setOpenMenu(null)
                          ;(event.currentTarget.previousElementSibling as HTMLElement | null)?.focus()
                        }
                      }}
                    >
                      <ul className="overflow-hidden rounded-card border border-border bg-surface p-1.5 shadow-float">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="block rounded-[0.3rem] px-3 py-2.5 transition-colors hover:bg-surface-muted"
                            >
                              <span className="block text-[0.8125rem] font-semibold text-heading">
                                {child.label}
                              </span>
                              {child.description ? (
                                <span className="mt-0.5 block text-xs leading-snug text-plum-500">
                                  {child.description}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle
            tone={solid ? 'solid' : 'over-media'}
            className="hidden sm:inline-flex"
          />

          <Link
            href={ROUTES.search}
            aria-label="Buscar en el sitio"
            className={cn(
              'hidden size-10 place-items-center rounded-control transition-colors sm:grid',
              solid ? 'text-foreground hover:bg-surface-strong' : 'text-white/90 hover:bg-white/10',
            )}
          >
            <SearchIcon className="size-[1.125rem]" aria-hidden="true" />
          </Link>

          <ButtonLink
            href={ROUTES.tours}
            size="sm"
            variant={solid ? 'primary' : 'accent'}
            className="hidden sm:inline-flex"
          >
            Reservar
          </ButtonLink>

          {/*
            Keyed on the pathname so navigating remounts the drawer, which
            resets it to closed. An effect calling setState on every route
            change would cause a cascading render for no benefit.
          */}
          <MobileNav key={pathname} tone={tone} />
        </div>
      </div>
    </header>
  )
}
