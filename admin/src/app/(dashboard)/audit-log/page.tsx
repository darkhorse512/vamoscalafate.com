import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma, type Prisma } from '@vamos/db'
import { formatDateTime } from '@vamos/shared'
import { Pagination } from '@/components/ui/DataTable'
import { EmptyState, PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Auditoría' }
export const dynamic = 'force-dynamic'

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creación', UPDATE: 'Modificación', DELETE: 'Eliminación',
  ARCHIVE: 'Archivado', PUBLISH: 'Publicación', UNPUBLISH: 'Despublicación',
  LOGIN: 'Inicio de sesión', LOGIN_FAILED: 'Acceso fallido', LOGOUT: 'Cierre de sesión',
  APPROVE: 'Aprobación', REJECT: 'Rechazo', REFUND: 'Reembolso', EXPORT: 'Exportación',
}

const ACTION_TONES: Record<string, string> = {
  CREATE: 'bg-status-successBg text-status-success',
  PUBLISH: 'bg-status-successBg text-status-success',
  APPROVE: 'bg-status-successBg text-status-success',
  DELETE: 'bg-status-dangerBg text-status-danger',
  REJECT: 'bg-status-dangerBg text-status-danger',
  LOGIN_FAILED: 'bg-status-dangerBg text-status-danger',
  REFUND: 'bg-status-warningBg text-status-warning',
  ARCHIVE: 'bg-status-warningBg text-status-warning',
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission('audit:read')

  const params = await searchParams
  const action = typeof params.action === 'string' ? params.action : undefined
  const entityType = typeof params.entity === 'string' ? params.entity : undefined
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = 50

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: action as Prisma.AuditLogWhereInput['action'] } : {}),
    ...(entityType ? { entityType } : {}),
  }

  const [entries, total, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, action: true, entityType: true, entityId: true, summary: true,
        actorEmail: true, ipAddress: true, createdAt: true,
        actor: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ['entityType'], _count: { _all: true } }),
  ])

  return (
    <>
      <PageHeader
        title="Registro de auditoría"
        description="Quién hizo qué y cuándo. Las entradas no se pueden editar ni borrar desde el panel."
      />

      <nav aria-label="Filtrar auditoría" className="mb-4 flex flex-wrap gap-2">
        <FilterLink href="/audit-log" active={!action && !entityType} label="Todo" />
        {['CREATE', 'UPDATE', 'PUBLISH', 'APPROVE', 'REFUND', 'LOGIN_FAILED'].map((value) => (
          <FilterLink
            key={value}
            href={`/audit-log?action=${value}`}
            active={action === value}
            label={ACTION_LABELS[value] ?? value}
          />
        ))}
        {entityTypes.slice(0, 6).map((row) => (
          <FilterLink
            key={row.entityType}
            href={`/audit-log?entity=${row.entityType}`}
            active={entityType === row.entityType}
            label={`${row.entityType} (${row._count._all})`}
          />
        ))}
      </nav>

      {entries.length === 0 ? (
        <EmptyState
          title="Sin registros"
          description="Las acciones del equipo quedarán registradas acá automáticamente."
        />
      ) : (
        <>
          <ol className="admin-panel divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    'shrink-0 rounded px-2 py-0.5 text-[0.6875rem] font-semibold',
                    ACTION_TONES[entry.action] ?? 'bg-surface-strong text-muted-foreground',
                  )}
                >
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] text-heading">{entry.summary}</p>
                  <p className="mt-0.5 text-[0.75rem] text-subtle-foreground">
                    {entry.actor?.name ?? entry.actorEmail ?? 'Sistema'}
                    {' · '}
                    {entry.entityType}
                    {entry.entityId ? ` · ${entry.entityId.slice(0, 12)}…` : ''}
                    {entry.ipAddress ? ` · ${entry.ipAddress}` : ''}
                  </p>
                </div>

                <time
                  dateTime={entry.createdAt.toISOString()}
                  className="tabular shrink-0 text-[0.75rem] text-subtle-foreground"
                >
                  {formatDateTime(entry.createdAt)}
                </time>
              </li>
            ))}
          </ol>

          <Pagination
            basePath="/audit-log"
            page={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            searchParams={{ action, entity: entityType }}
          />
        </>
      )}
    </>
  )
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-control border px-2.5 py-1.5 text-[0.8125rem] transition-colors',
        active ? 'border-violet-600 bg-violet-50' : 'border-border-strong bg-surface hover:bg-surface-muted',
      )}
    >
      {label}
    </Link>
  )
}
