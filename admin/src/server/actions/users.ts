'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@vamos/db'
import { actionError, actionOk, logger, toPublicError, type ActionResult } from '@vamos/shared'
import { adminUserCreateSchema, adminUserUpdateSchema } from '@vamos/validation'
import { requirePermission, revokeAllSessions } from '../auth'
import { recordAudit } from '../audit'

const log = logger.scoped('admin:users')

/**
 * Administrator account management - the most sensitive surface in the app.
 *
 * Guard rails:
 *   · Only SUPER_ADMIN reaches these (the `users:*` permissions belong to no
 *     other role).
 *   · A user cannot change their own role or deactivate themselves, which
 *     would let the last owner lock everyone out.
 *   · Deactivating an account revokes its sessions immediately.
 *   · Password hashes never appear in an audit snapshot - see audit.ts.
 */

const BCRYPT_COST = 12

export async function createAdminUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission('users:create')

    const parsed = adminUserCreateSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos del usuario.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const existing = await prisma.adminUser.findUnique({
      where: { email: data.email },
      select: { id: true },
    })
    if (existing) {
      return actionError('CONFLICT', 'Ya existe un usuario con ese email.')
    }

    const user = await prisma.adminUser.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: await bcrypt.hash(data.password, BCRYPT_COST),
        role: data.role,
        isActive: data.isActive,
      },
      select: { id: true, email: true, name: true, role: true },
    })

    await recordAudit({
      action: 'CREATE',
      entityType: 'AdminUser',
      entityId: user.id,
      summary: `Usuario creado: ${user.email} (${user.role})`,
      after: { email: user.email, name: user.name, role: user.role },
      actorId: session.id,
      actorEmail: session.email,
    })

    log.info('Admin user created', { userId: user.id, role: user.role, actorId: session.id })

    revalidatePath('/users')
    return actionOk({ id: user.id })
  } catch (error) {
    log.error('Admin user creation failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function updateAdminUserAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('users:update')

    const parsed = adminUserUpdateSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos del usuario.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const existing = await prisma.adminUser.findUnique({
      where: { id: data.id },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })
    if (!existing) return actionError('NOT_FOUND', 'El usuario no existe.')

    // Self-lockout guards.
    if (existing.id === session.id) {
      if (data.role !== existing.role) {
        return actionError('FORBIDDEN', 'No podés cambiar tu propio rol.')
      }
      if (!data.isActive) {
        return actionError('FORBIDDEN', 'No podés desactivar tu propia cuenta.')
      }
    }

    // Never leave the system without an active owner.
    if (existing.role === 'SUPER_ADMIN' && (data.role !== 'SUPER_ADMIN' || !data.isActive)) {
      const otherOwners = await prisma.adminUser.count({
        where: { role: 'SUPER_ADMIN', isActive: true, id: { not: existing.id } },
      })
      if (otherOwners === 0) {
        return actionError(
          'FORBIDDEN',
          'Debe quedar al menos un super administrador activo.',
        )
      }
    }

    await prisma.adminUser.update({
      where: { id: data.id },
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        ...(data.password ? { passwordHash: await bcrypt.hash(data.password, BCRYPT_COST) } : {}),
        // A rotated password should also clear a lockout.
        ...(data.password ? { failedLoginAttempts: 0, lockedUntil: null } : {}),
      },
    })

    // Deactivation or a password change must not leave live sessions behind.
    if (!data.isActive || data.password) {
      await revokeAllSessions(data.id)
    }

    await recordAudit({
      action: 'UPDATE',
      entityType: 'AdminUser',
      entityId: data.id,
      summary: `Usuario actualizado: ${data.email}${data.password ? ' (contraseña rotada)' : ''}`,
      before: { email: existing.email, role: existing.role, isActive: existing.isActive },
      after: { email: data.email, role: data.role, isActive: data.isActive },
      actorId: session.id,
      actorEmail: session.email,
    })

    log.info('Admin user updated', { userId: data.id, actorId: session.id })

    revalidatePath('/users')
    return actionOk(undefined)
  } catch (error) {
    log.error('Admin user update failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
