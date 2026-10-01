'use client'

import { useState } from 'react'
import { LogOut, Menu } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { logoutAction } from '@/server/actions/auth'

/**
 * Admin chrome: sidebar, top bar and the signed-in user menu.
 *
 * A Client Component only because the mobile drawer and the user menu need
 * state. Everything it renders is passed down from the server, so no session
 * data or permission logic reaches the browser beyond what is displayed.
 */
export function AdminShell({
  user,
  allowedResources,
  children,
}: {
  user: { name: string; email: string; roleLabel: string }
  allowedResources: string[]
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="min-h-dvh">
      <AdminSidebar
        allowedResources={allowedResources}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-(--sidebar-width)">
        <header className="sticky top-0 z-30 flex h-(--topbar-height) items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={sidebarOpen}
            className="grid size-9 place-items-center rounded-control text-muted-foreground hover:bg-surface-strong lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />

            <div className="hidden text-right sm:block">
              <p className="text-[0.8125rem] font-medium leading-tight text-heading">
                {user.name}
              </p>
              <p className="text-[0.6875rem] leading-tight text-subtle-foreground">{user.roleLabel}</p>
            </div>

            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-700 text-[0.6875rem] font-bold text-white"
              aria-hidden="true"
            >
              {initials}
            </span>

            {/* A real form POST, so sign-out works without JavaScript and is
                protected by the SameSite cookie policy. */}
            <form action={logoutAction}>
              <button
                type="submit"
                className="grid size-9 place-items-center rounded-control text-subtle-foreground transition-colors hover:bg-surface-strong hover:text-heading"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <main id="contenido" className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
