import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@vamos/db'
import { formatDateTime } from '@vamos/shared'
import { LegalPageEditor } from '@/components/LegalPageEditor'
import { PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Editar página legal' }
export const dynamic = 'force-dynamic'

export default async function EditLegalPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('settings:update')
  const { id } = await params

  const page = await prisma.staticPage.findUnique({ where: { id } })
  if (!page) notFound()

  return (
    <>
      <Link
        href="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Volver a ajustes
      </Link>

      <PageHeader
        title={page.title}
        description={`/${page.slug} · última actualización ${formatDateTime(page.updatedAt)}`}
      />

      <LegalPageEditor
        pageId={page.id}
        initial={{
          title: page.title,
          slug: page.slug,
          content: page.content,
          status: page.status,
        }}
      />
    </>
  )
}
