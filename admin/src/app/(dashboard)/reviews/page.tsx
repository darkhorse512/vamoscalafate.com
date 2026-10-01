import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma, type Prisma } from '@vamos/db'
import { can, formatDate } from '@vamos/shared'
import { ReviewModeration } from '@/components/ReviewModeration'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Reseñas' }
export const dynamic = 'force-dynamic'

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requirePermission('reviews:read')

  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : 'PENDING'

  const where: Prisma.ReviewWhereInput =
    status === 'ALL' ? {} : { status: status as Prisma.ReviewWhereInput['status'] }

  const [reviews, counts] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        tour: { select: { name: true, slug: true } },
        hotel: { select: { name: true, slug: true } },
        business: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]))
  const canModerate = can(session.role, 'reviews:update')

  return (
    <>
      <PageHeader
        title="Reseñas"
        description="Las reseñas se publican solo después de moderarlas. Nunca se crean automáticamente."
      />

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((value) => (
          <Link
            key={value}
            href={`/reviews?status=${value}`}
            aria-current={status === value ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1.5 text-[0.8125rem] transition-colors',
              status === value
                ? 'border-primary bg-primary-soft'
                : 'border-border-strong bg-surface hover:bg-surface-muted',
            )}
          >
            {value === 'ALL' ? 'Todas' : <StatusBadge status={value} />}
            {value !== 'ALL' ? (
              <span className="tabular text-[0.75rem] text-subtle-foreground">
                {countByStatus[value] ?? 0}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {reviews.length === 0 ? (
        <EmptyState
          title="No hay reseñas"
          description="Las reseñas llegan desde el sitio público y esperan moderación antes de publicarse. No se generan reseñas de ejemplo."
        />
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => {
            const subject = review.tour ?? review.hotel ?? review.business

            return (
              <li key={review.id} className="admin-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.875rem] font-semibold text-heading">
                      {review.authorName}
                      {review.authorCountry ? (
                        <span className="ml-1.5 font-normal text-subtle-foreground">
                          · {review.authorCountry}
                        </span>
                      ) : null}
                      {review.isVerified ? (
                        <span className="ml-2 rounded bg-status-successBg px-1.5 py-0.5 text-[0.625rem] font-semibold text-status-success">
                          VERIFICADA
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[0.75rem] text-subtle-foreground">
                      {subject?.name ?? 'Sin entidad'} · {formatDate(review.createdAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className="text-[0.875rem] text-status-warning"
                      aria-label={`${review.rating} de 5 estrellas`}
                    >
                      {'★'.repeat(review.rating)}
                      <span className="text-slate-300">{'★'.repeat(5 - review.rating)}</span>
                    </span>
                    <StatusBadge status={review.status} />
                  </div>
                </div>

                {review.title ? (
                  <p className="mt-2.5 text-[0.875rem] font-medium text-heading">{review.title}</p>
                ) : null}

                <p className="mt-1.5 whitespace-pre-line text-[0.8125rem] leading-relaxed text-foreground">
                  {review.content}
                </p>

                {canModerate ? (
                  <ReviewModeration reviewId={review.id} currentStatus={review.status} />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
