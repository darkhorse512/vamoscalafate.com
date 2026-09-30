import type { Metadata } from 'next'
import { prisma, type Prisma } from '@vamos/db'
import { formatDateTime } from '@vamos/shared'
import { Pagination } from '@/components/ui/DataTable'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Consultas' }
export const dynamic = 'force-dynamic'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission('dashboard:read')

  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : undefined
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = 25

  const where: Prisma.ContactSubmissionWhereInput = status
    ? { status: status as Prisma.ContactSubmissionWhereInput['status'] }
    : {}

  const [contacts, total] = await Promise.all([
    prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contactSubmission.count({ where }),
  ])

  return (
    <>
      <PageHeader
        title="Consultas"
        description="Mensajes recibidos desde el formulario de contacto del sitio."
      />

      {contacts.length === 0 ? (
        <EmptyState
          title="No hay consultas"
          description="Los mensajes del formulario de contacto aparecerán acá."
        />
      ) : (
        <>
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li key={contact.id} className="admin-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.875rem] font-semibold text-slate-900">
                      {contact.subject}
                    </p>
                    <p className="text-[0.75rem] text-slate-500">
                      {contact.name} ·{' '}
                      <a
                        href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
                        className="text-glacier-700 hover:underline"
                      >
                        {contact.email}
                      </a>
                      {contact.phone ? ` · ${contact.phone}` : ''}
                      {' · '}
                      {formatDateTime(contact.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={contact.status} />
                </div>

                <p className="mt-2.5 whitespace-pre-line text-[0.8125rem] leading-relaxed text-slate-700">
                  {contact.message}
                </p>

                {contact.tourSlug || contact.utmSource ? (
                  <p className="mt-2 text-[0.75rem] text-slate-500">
                    {contact.tourSlug ? `Excursión: ${contact.tourSlug}` : ''}
                    {contact.tourSlug && contact.utmSource ? ' · ' : ''}
                    {contact.utmSource ? `Fuente: ${contact.utmSource}` : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <Pagination
            basePath="/contacts"
            page={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            searchParams={{ status }}
          />
        </>
      )}
    </>
  )
}
