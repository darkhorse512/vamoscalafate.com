'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@vamos/db'
import { actionError, actionOk, toPublicError, type ActionResult } from '@vamos/shared'
import { HOME_CONFIG_KEY, HOME_SECTION_IDS, homeConfigSchema } from '@vamos/validation'
import { requirePermission } from '../auth'
import { recordAudit } from '../audit'
import { revalidateEntity } from '../revalidate'

/**
 * Saves the homepage configuration edited in "Página de inicio".
 *
 * Validated with the same schema the public site uses to read it, so what
 * is saved is always renderable. The public homepage is purged immediately.
 */
export async function saveHomeConfigAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('settings:update')

    const parsed = homeConfigSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        ;(fieldErrors[key] ??= []).push(issue.message)
      }
      return actionError('VALIDATION_ERROR', 'Revisá los campos marcados.', fieldErrors)
    }

    const order = parsed.data.order
    if (order.length !== HOME_SECTION_IDS.length || new Set(order).size !== order.length) {
      return actionError('VALIDATION_ERROR', 'El orden de las secciones no es válido. Recargá la página.')
    }

    const existing = await prisma.siteSetting.findUnique({ where: { key: HOME_CONFIG_KEY }, select: { value: true } })

    await prisma.siteSetting.upsert({
      where: { key: HOME_CONFIG_KEY },
      create: { key: HOME_CONFIG_KEY, group: 'homepage', label: 'Página de inicio', value: parsed.data },
      update: { value: parsed.data },
    })

    await recordAudit({
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'SiteSetting',
      entityId: HOME_CONFIG_KEY,
      summary: 'Página de inicio actualizada',
      before: existing?.value,
      after: parsed.data,
      actorId: session.id,
      actorEmail: session.email,
    })

    await revalidateEntity('siteSetting')
    revalidatePath('/homepage')
    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
