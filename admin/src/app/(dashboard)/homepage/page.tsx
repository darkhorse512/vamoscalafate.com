import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { can, publicEnv } from '@vamos/shared'
import { HOME_CONFIG_KEY, resolveHomeConfig } from '@vamos/validation'
import { HomeEditor } from '@/components/HomeEditor'
import { PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Página de inicio' }

/**
 * Homepage editor: every section of the public homepage — order, visibility,
 * texts, buttons, images and items — from one screen.
 */
export default async function HomepageEditorPage() {
  const session = await requirePermission('settings:read')

  const [row, tours, destinations] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { key: HOME_CONFIG_KEY }, select: { value: true, updatedAt: true } }),
    prisma.tour.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { slug: true, name: true },
    }),
    prisma.destination.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true },
    }),
  ])

  return (
    <>
      <PageHeader
        title="Página de inicio"
        description="Elegí qué secciones se muestran, en qué orden y con qué textos, botones e imágenes. Los cambios se publican al guardar."
      />
      <HomeEditor
        initial={resolveHomeConfig(row?.value)}
        tours={tours}
        destinations={destinations}
        canEdit={can(session.role, 'settings:update')}
        siteUrl={publicEnv.NEXT_PUBLIC_SITE_URL}
        lastSaved={row?.updatedAt.toISOString() ?? null}
      />
    </>
  )
}
