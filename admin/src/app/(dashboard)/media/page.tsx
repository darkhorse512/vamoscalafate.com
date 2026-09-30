import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { formatDate, serverEnv } from '@vamos/shared'
import { MediaLibrary } from '@/components/MediaLibrary'
import { Alert, PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Medios' }
export const dynamic = 'force-dynamic'

export default async function MediaPage() {
  await requirePermission('media:read')

  const [media, totalBytes] = await Promise.all([
    prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true, type: true, url: true, filename: true, mimeType: true,
        size: true, altText: true, createdAt: true,
        uploadedBy: { select: { name: true } },
      },
    }),
    prisma.media.aggregate({ _sum: { size: true } }),
  ])

  const env = serverEnv()
  const usingLocalStorage = env.STORAGE_DRIVER === 'local'

  return (
    <>
      <PageHeader
        title="Biblioteca de medios"
        description={`${media.length} archivos · ${((totalBytes._sum.size ?? 0) / 1024 / 1024).toFixed(1)} MB en total`}
      />

      {usingLocalStorage ? (
        <div className="mb-5">
          <Alert tone="info" title="Almacenamiento local">
            Los archivos se guardan en <code className="font-mono">{env.STORAGE_LOCAL_DIR}</code> y
            los sirve Nginx directamente. Incluí ese directorio en las copias de seguridad: no está
            en la base de datos ni en el repositorio.
          </Alert>
        </div>
      ) : null}

      <MediaLibrary
        items={media.map((item) => ({
          id: item.id,
          type: item.type,
          url: item.url,
          filename: item.filename,
          mimeType: item.mimeType,
          sizeLabel:
            item.size > 0 ? `${(item.size / 1024).toFixed(0)} KB` : 'Externo',
          altText: item.altText ?? '',
          uploadedBy: item.uploadedBy?.name ?? 'Sistema',
          createdAt: formatDate(item.createdAt),
        }))}
      />
    </>
  )
}
