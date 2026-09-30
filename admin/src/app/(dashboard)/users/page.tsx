import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { ROLE_DESCRIPTIONS, formatDateTime, permissionsForRole } from '@vamos/shared'
import { UserManager } from '@/components/UserManager'
import { PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Usuarios' }
export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await requirePermission('users:read')

  const users = await prisma.adminUser.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true, email: true, name: true, role: true, isActive: true,
      lastLoginAt: true, lockedUntil: true, createdAt: true,
      _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } },
    },
  })

  return (
    <>
      <PageHeader
        title="Usuarios y permisos"
        description="Cuentas con acceso al panel. Cada rol determina qué secciones puede ver y modificar."
      />

      <UserManager
        currentUserId={session.id}
        users={users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : null,
          isLocked: Boolean(user.lockedUntil && user.lockedUntil > new Date()),
          activeSessions: user._count.sessions,
        }))}
      />

      <section className="mt-8">
        <h2 className="mb-3 text-[0.875rem] font-semibold text-slate-900">Roles disponibles</h2>

        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(ROLE_DESCRIPTIONS) as (keyof typeof ROLE_DESCRIPTIONS)[]).map((role) => {
            const permissions = permissionsForRole(role)
            const resources = [...new Set(permissions.map((p) => p.split(':')[0]))]

            return (
              <li key={role} className="admin-panel p-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-[0.8125rem] font-semibold text-slate-900">
                    {ROLE_DESCRIPTIONS[role].name}
                  </h3>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.625rem] text-slate-600">
                    {role}
                  </code>
                </div>

                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-600">
                  {ROLE_DESCRIPTIONS[role].description}
                </p>

                <p className="mt-3 text-[0.75rem] text-slate-500">
                  {role === 'SUPER_ADMIN'
                    ? 'Acceso a todas las secciones sin restricción.'
                    : `Acceso a: ${resources.join(', ')}`}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[0.875rem] font-semibold text-slate-900">Sesiones activas</h2>
        <div className="admin-panel overflow-hidden">
          <table className="admin-table">
            <caption className="sr-only">Sesiones activas por usuario</caption>
            <thead>
              <tr>
                <th scope="col">Usuario</th>
                <th scope="col">Último acceso</th>
                <th scope="col" className="text-right">Sesiones</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-[0.75rem] text-slate-500">{user.email}</p>
                  </td>
                  <td>
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca ingresó'}
                  </td>
                  <td className="tabular text-right">{user._count.sessions}</td>
                  <td>
                    <StatusBadge status={user.isActive ? 'APPROVED' : 'ARCHIVED'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
