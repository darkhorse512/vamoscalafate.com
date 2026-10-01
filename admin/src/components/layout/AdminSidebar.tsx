'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BedDouble, CalendarCheck, CreditCard, FileText, Image as ImageIcon, Inbox,
  Landmark, LayoutDashboard, LayoutTemplate, MapPin, Mountain, ScrollText, Search, Settings,
  Shield, Star, Store, Tags, Users, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ADMIN_NAV, type NavGroup } from './navigation'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, LayoutTemplate, CalendarCheck, Users, CreditCard, Mountain, Tags, MapPin,
  Landmark, BedDouble, Store, Inbox, Star, FileText, Image: ImageIcon, Search,
  Settings, Shield, ScrollText,
}

/**
 * Sidebar navigation.
 *
 * `allowedResources` is computed on the server from the user's role and passed
 * in, so the RBAC matrix never has to ship to the browser.
 */
export function AdminSidebar({
  allowedResources,
  open,
  onClose,
}: {
  allowedResources: string[]
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const allowed = new Set(allowedResources)

  const groups: NavGroup[] = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowed.has(item.resource)),
  })).filter((group) => group.items.length > 0)

  const content = (
    <nav aria-label="Navegación del panel" className="flex h-full flex-col">
      <div className="flex h-(--topbar-height) shrink-0 items-center justify-between border-b border-slate-800 px-4">
        {/* The artwork carries the name; the light rendition reads on the
            dark sidebar. A small badge marks this as the console. */}
        <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Vamos Calafate - panel">
          <Image
            src="/brand/logo-light.png"
            alt=""
            width={646}
            height={192}
            unoptimized
            priority
            className="h-8 w-auto"
          />
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Admin
          </span>
        </Link>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="grid size-8 place-items-center rounded text-subtle-foreground hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-1.5 px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.11em] text-subtle-foreground">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[0.8125rem] font-medium transition-colors',
                        isActive
                          ? 'bg-violet-700 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-slate-800 p-3">
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vamoscalafate.com'}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-control px-2.5 py-2 text-[0.75rem] text-subtle-foreground transition-colors hover:bg-slate-800 hover:text-white"
        >
          Ver el sitio público ↗
        </a>
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop: always present */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-(--sidebar-width) bg-slate-900 lg:block">
        {content}
      </aside>

      {/* Mobile: overlay drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/55"
          />
          <aside className="absolute inset-y-0 left-0 w-(--sidebar-width) bg-slate-900">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  )
}
