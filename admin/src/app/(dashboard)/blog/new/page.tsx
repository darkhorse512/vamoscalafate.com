import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@vamos/db'
import { BlogEditor } from '@/components/BlogEditor'
import { EMPTY_POST } from '@/lib/blog-form-data'
import { PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Nuevo artículo' }
export const dynamic = 'force-dynamic'

export default async function NewPostPage() {
  await requirePermission('blog:create')

  const [categories, destinations, tags] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.destination.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.blogTag.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  return (
    <>
      <Link
        href="/blog"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted-foreground hover:text-heading"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Volver al blog
      </Link>

      <PageHeader title="Nuevo artículo" description="Escribí en Markdown y previsualizá antes de publicar." />

      <BlogEditor initial={EMPTY_POST} categories={categories} destinations={destinations} tags={tags} />
    </>
  )
}
