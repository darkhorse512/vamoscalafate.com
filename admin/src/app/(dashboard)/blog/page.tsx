import type { Metadata } from 'next'
import { Plus } from 'lucide-react'
import { prisma, type Prisma } from '@vamos/db'
import { can, formatDate } from '@vamos/shared'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { ButtonLink, EmptyState, PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Blog' }
export const dynamic = 'force-dynamic'

type Row = {
  id: string
  title: string
  slug: string
  status: string
  categoryName: string
  readingTime: number
  publishedAt: Date | null
  isDemo: boolean
  scheduled: boolean
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requirePermission('blog:read')

  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : undefined
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = 25

  const where: Prisma.BlogPostWhereInput = status
    ? { status: status as Prisma.BlogPostWhereInput['status'] }
    : {}

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, title: true, slug: true, status: true, readingTime: true,
        publishedAt: true, isDemo: true,
        category: { select: { name: true } },
      },
    }),
    prisma.blogPost.count({ where }),
  ])

  const now = new Date()

  const rows: Row[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    categoryName: post.category?.name ?? '—',
    readingTime: post.readingTime,
    publishedAt: post.publishedAt,
    isDemo: post.isDemo,
    // A published post with a future date is scheduled, not live.
    scheduled: post.status === 'PUBLISHED' && Boolean(post.publishedAt && post.publishedAt > now),
  }))

  const columns: Column<Row>[] = [
    {
      key: 'title',
      header: 'Título',
      cell: (row) => (
        <span>
          {row.title}
          {row.isDemo ? (
            <span className="ml-2 rounded bg-status-warningBg px-1.5 py-0.5 text-[0.625rem] font-semibold text-status-warning">
              DEMO
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'category', header: 'Categoría', cell: (row) => row.categoryName },
    {
      key: 'readingTime',
      header: 'Lectura',
      numeric: true,
      cell: (row) => `${row.readingTime} min`,
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={row.status} />
          {row.scheduled ? (
            <span className="rounded bg-status-infoBg px-1.5 py-0.5 text-[0.625rem] font-semibold text-status-info">
              PROGRAMADO
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'publishedAt',
      header: 'Publicación',
      cell: (row) => (row.publishedAt ? formatDate(row.publishedAt) : '—'),
    },
  ]

  const canCreate = can(session.role, 'blog:create')

  return (
    <>
      <PageHeader
        title="Blog"
        description={`${total} artículos.`}
        action={
          canCreate ? (
            <ButtonLink href="/blog/new" size="sm">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo artículo
            </ButtonLink>
          ) : undefined
        }
      />

      {rows.length === 0 && !status ? (
        <EmptyState
          title="Todavía no hay artículos"
          description="El blog es la principal fuente de tráfico orgánico. Empezá con las consultas que más te hacen."
          action={canCreate ? <ButtonLink href="/blog/new" size="sm">Nuevo artículo</ButtonLink> : undefined}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowHref={(row) => `/blog/${row.id}/edit`}
            caption="Listado de artículos"
            emptyMessage="No hay artículos con ese estado."
          />
          <Pagination
            basePath="/blog"
            page={page}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            searchParams={{ status }}
          />
        </>
      )}
    </>
  )
}
