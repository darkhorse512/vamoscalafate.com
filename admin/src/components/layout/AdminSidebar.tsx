'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BedDouble, CalendarCheck, CreditCard, FileText, Image as ImageIcon, Inbox,
  Landmark, LayoutDashboard, MapPin, Mountain, ScrollText, Search, Settings,
  Shield, Star, Store, Tags, Users, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ADMIN_NAV, type NavGroup } from './navigation'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, CalendarCheck, Users, CreditCard, Mountain, Tags, MapPin,
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
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded bg-glacier-600" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="size-4" fill="none">
              <path d="M2 16.5 L7 8 L11 13 L15.5 5.5 L22 16.5 Z" fill="#ffffff" />
              <path d="M2 17.8 h20 v1.6 H2 Z" fill="#ffffff" opacity="0.7" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[0.8125rem] font-bold text-white">Vamos Calafate</span>
            <span className="mt-0.5 text-[0.5625rem] font-medium uppercase tracking-[0.13em] text-slate-400">
              Administración
            </span>
          </span>
        </Link>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="grid size-8 place-items-center rounded text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        {groups.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-1.5 px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.11em] text-slate-500">
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
                          ? 'bg-glacier-700 text-white'
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
          className="block rounded-control px-2.5 py-2 text-[0.75rem] text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
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
