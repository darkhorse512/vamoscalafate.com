import { RESOURCES, ROLE_DESCRIPTIONS, canAccessResource } from '@vamos/shared'
import { AdminShell } from '@/components/layout/AdminShell'
import { requireSession } from '@/server/auth'

/**
 * Authenticated shell.
 *
 * `requireSession()` runs here, so every route in this group is gated by a
 * real database-backed session check — not only by the edge middleware, which
 * can see the cookie but cannot validate it.
 *
 * Individual pages additionally call `requirePermission()` for the specific
 * capability they need.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()

  // Computed server-side; only the resulting list of resource names is sent to
  // the client, never the permission matrix itself.
  const allowedResources = RESOURCES.filter((resource) =>
    canAccessResource(session.role, resource),
  )

  return (
    <AdminShell
      user={{
        name: session.name,
        email: session.email,
        roleLabel: ROLE_DESCRIPTIONS[session.role]?.name ?? session.role,
      }}
      allowedResources={allowedResources}
    >
      {children}
    </AdminShell>
  )
}
