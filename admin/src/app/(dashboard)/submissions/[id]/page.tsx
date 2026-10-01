import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { prisma } from '@vamos/db'
import { can, formatDateTime, publicEnv } from '@vamos/shared'
import { SubmissionReview } from '@/components/SubmissionReview'
import { PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Revisar solicitud' }
export const dynamic = 'force-dynamic'

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requirePermission('submissions:read')
  const { id } = await params

  const submission = await prisma.hotelSubmission.findUnique({
    where: { id },
    include: {
      reviewedBy: { select: { name: true } },
      hotel: { select: { slug: true } },
      business: { select: { slug: true, category: { select: { channel: true } } } },
    },
  })

  if (!submission) notFound()

  const canReview = can(session.role, 'submissions:update')

  const publishedUrl = submission.hotel
    ? `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/hoteles/${submission.hotel.slug}`
    : submission.business
      ? `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/${
          submission.business.category.channel === 'restaurantes' ? 'restaurantes' : 'servicios'
        }/${submission.business.slug}`
      : null

  return (
    <>
      <Link
        href="/submissions"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-heading"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Volver a solicitudes
      </Link>

      <PageHeader
        title={submission.businessName}
        description={`${submission.reference} · recibida el ${formatDateTime(submission.createdAt)}`}
        action={<StatusBadge status={submission.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <section className="admin-panel p-4">
            <h2 className="text-[0.8125rem] font-semibold text-heading">Datos enviados</h2>

            <dl className="mt-3 grid gap-x-6 gap-y-2.5 text-[0.8125rem] sm:grid-cols-2">
              <Row label="Tipo" value={submission.kind === 'HOTEL' ? 'Alojamiento' : 'Comercio'} />
              <Row label="Contacto" value={submission.contactName} />
              <Row label="Email" value={submission.email} />
              <Row label="Teléfono" value={submission.phone} />
              {submission.address ? <Row label="Dirección" value={submission.address} /> : null}
              {submission.openingHours ? (
                <Row label="Horarios" value={submission.openingHours} />
              ) : null}
            </dl>

            {submission.website ? (
              <p className="mt-3 text-[0.8125rem]">
                <span className="text-subtle-foreground">Sitio web: </span>
                <a
                  href={submission.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="break-all text-violet-700 hover:underline"
                >
                  {submission.website}
                </a>
              </p>
            ) : null}
          </section>

          <section className="admin-panel p-4">
            <h2 className="text-[0.8125rem] font-semibold text-heading">Descripción</h2>
            <p className="mt-2 whitespace-pre-line text-[0.8125rem] leading-relaxed text-foreground">
              {submission.description}
            </p>
          </section>

          {submission.amenities.length > 0 || submission.services.length > 0 ? (
            <section className="admin-panel p-4">
              <h2 className="text-[0.8125rem] font-semibold text-heading">
                {submission.kind === 'HOTEL' ? 'Servicios declarados' : 'Qué ofrece'}
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {[...submission.amenities, ...submission.services].map((item) => (
                  <li
                    key={item}
                    className="rounded-full bg-surface-strong px-2.5 py-1 text-[0.75rem] text-foreground"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {submission.imageUrls.length > 0 || submission.videoUrls.length > 0 ? (
            <section className="admin-panel p-4">
              <h2 className="text-[0.8125rem] font-semibold text-heading">Medios enviados</h2>
              <p className="mt-1 text-[0.75rem] text-subtle-foreground">
                Enlaces proporcionados por el solicitante. Verificalos antes de aprobar: no se
                descargan automáticamente.
              </p>

              <ul className="mt-3 space-y-1.5">
                {[...submission.imageUrls, ...submission.videoUrls].map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 break-all text-[0.8125rem] text-violet-700 hover:underline"
                    >
                      {url}
                      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {submission.extraInfo ? (
            <section className="admin-panel p-4">
              <h2 className="text-[0.8125rem] font-semibold text-heading">
                Información adicional
              </h2>
              <p className="mt-2 whitespace-pre-line text-[0.8125rem] leading-relaxed text-foreground">
                {submission.extraInfo}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          {publishedUrl ? (
            <section className="admin-panel p-4">
              <h2 className="text-[0.8125rem] font-semibold text-heading">Ficha publicada</h2>
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 break-all text-[0.8125rem] text-violet-700 hover:underline"
              >
                Ver en el sitio público
                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              </a>
            </section>
          ) : null}

          {submission.reviewNotes ? (
            <section className="admin-panel p-4">
              <h2 className="text-[0.8125rem] font-semibold text-heading">Notas de revisión</h2>
              <p className="mt-2 whitespace-pre-line text-[0.8125rem] leading-relaxed text-foreground">
                {submission.reviewNotes}
              </p>
              {submission.reviewedBy && submission.reviewedAt ? (
                <p className="mt-2 text-[0.75rem] text-subtle-foreground">
                  {submission.reviewedBy.name} · {formatDateTime(submission.reviewedAt)}
                </p>
              ) : null}
            </section>
          ) : null}

          {canReview ? (
            <SubmissionReview
              submissionId={submission.id}
              currentStatus={submission.status}
              alreadyPublished={Boolean(submission.hotel || submission.business)}
            />
          ) : null}
        </aside>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-heading">{value}</dd>
    </div>
  )
}
