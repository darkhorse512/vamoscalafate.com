import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { prisma } from '@vamos/db'
import { publicEnv } from '@vamos/shared'
import { BlogEditor } from '@/components/BlogEditor'
import type { BlogFormData } from '@/lib/blog-form-data'
import { PageHeader, StatusBadge } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Editar artículo' }
export const dynamic = 'force-dynamic'

/** Formats a Date for a `datetime-local` input, which expects local time. */
function toLocalInput(date: Date | null): string {
  if (!date) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('blog:update')
  const { id } = await params

  const [post, categories, destinations, tags] = await Promise.all([
    prisma.blogPost.findUnique({
      where: { id },
      include: { seo: true, tags: { select: { tagId: true } } },
    }),
    prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.destination.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.blogTag.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  if (!post) notFound()

  const initial: BlogFormData = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    categoryId: post.categoryId ?? '',
    destinationId: post.destinationId ?? '',
    heroImageId: post.heroImageId ?? '',
    tagIds: post.tags.map((t) => t.tagId),
    featured: post.featured,
    publishedAt: toLocalInput(post.publishedAt),
    seo: {
      title: post.seo?.title ?? '',
      description: post.seo?.description ?? '',
      canonicalUrl: post.seo?.canonicalUrl ?? '',
      ogTitle: post.seo?.ogTitle ?? '',
      ogDescription: post.seo?.ogDescription ?? '',
      ogImageUrl: post.seo?.ogImageUrl ?? '',
      noindex: post.seo?.noindex ?? false,
      nofollow: post.seo?.nofollow ?? false,
    },
  }

  const publicUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/blog/${post.slug}`

  return (
    <>
      <Link
        href="/blog"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Volver al blog
      </Link>

      <PageHeader
        title={post.title}
        description={`/blog/${post.slug}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={post.status} />
            {post.status === 'PUBLISHED' ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-glacier-700 hover:text-glacier-900"
              >
                Ver publicado
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        }
      />

      <BlogEditor initial={initial} categories={categories} destinations={destinations} tags={tags} />
    </>
  )
}
