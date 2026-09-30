'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@vamos/db'
import { actionError, actionOk, logger, toPublicError, type ActionResult } from '@vamos/shared'
import {
  ALLOWED_DOCUMENT_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES,
  MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES, mediaUpdateSchema, mediaVideoSchema,
} from '@vamos/validation'
import { requirePermission } from '../auth'
import { recordAudit } from '../audit'
import { buildStorageKey, contentHash, getStorage, verifyFileContent } from '../storage'

const log = logger.scoped('admin:media')

const ALLOWED = new Set<string>([...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_DOCUMENT_MIME_TYPES])

/**
 * Media upload.
 *
 * Layered validation, because any single check can be bypassed:
 *   1. MIME type must be on the allow-list (SVG is excluded — it can carry
 *      script and would be stored XSS served from our own origin).
 *   2. Size limit, enforced on the real byte length, not a declared header.
 *   3. Magic-byte check against the declared type.
 *   4. The stored path is generated, never derived from the filename.
 */
export async function uploadMediaAction(formData: FormData): Promise<ActionResult<{ id: string; url: string }>> {
  try {
    const session = await requirePermission('media:create')

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return actionError('VALIDATION_ERROR', 'No se recibió ningún archivo.')
    }

    if (!ALLOWED.has(file.type)) {
      return actionError(
        'VALIDATION_ERROR',
        'Tipo de archivo no permitido. Usá JPG, PNG, WebP, AVIF o PDF.',
      )
    }

    const isImage = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES

    if (file.size > maxBytes) {
      return actionError(
        'VALIDATION_ERROR',
        `El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB.`,
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // The declared size can lie; this is the real one.
    if (buffer.byteLength > maxBytes) {
      return actionError('VALIDATION_ERROR', 'El archivo supera el tamaño máximo permitido.')
    }

    verifyFileContent(buffer, file.type)

    // Identical bytes uploaded twice reuse the existing row.
    const hash = contentHash(buffer)
    const duplicate = await prisma.media.findFirst({
      where: { storageKey: { endsWith: `${hash}` } },
      select: { id: true, url: true },
    })
    if (duplicate) {
      return actionOk({ id: duplicate.id, url: duplicate.url })
    }

    const key = buildStorageKey(file.name, file.type)
    const { url } = await getStorage().put(key, buffer, file.type)

    const media = await prisma.media.create({
      data: {
        type: isImage ? 'IMAGE' : 'DOCUMENT',
        storageKey: key,
        url,
        filename: file.name.slice(0, 200),
        mimeType: file.type,
        size: buffer.byteLength,
        altText: String(formData.get('altText') ?? '').slice(0, 300) || null,
        caption: String(formData.get('caption') ?? '').slice(0, 500) || null,
        uploadedById: session.id,
      },
      select: { id: true, url: true, filename: true },
    })

    await recordAudit({
      action: 'CREATE',
      entityType: 'Media',
      entityId: media.id,
      summary: `Archivo subido: ${media.filename}`,
      actorId: session.id,
      actorEmail: session.email,
    })

    log.info('Media uploaded', { mediaId: media.id, bytes: buffer.byteLength })

    revalidatePath('/media')
    return actionOk({ id: media.id, url: media.url })
  } catch (error) {
    log.error('Media upload failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

/** Registers an externally hosted video (YouTube / Vimeo). */
export async function addVideoAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission('media:create')

    const parsed = mediaVideoSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Solo se admiten enlaces de YouTube o Vimeo.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const media = await prisma.media.create({
      data: {
        type: 'VIDEO',
        // Videos are not stored, so the key is synthetic and simply unique.
        storageKey: `external/video/${Buffer.from(data.externalUrl).toString('base64url').slice(0, 60)}`,
        url: data.externalUrl,
        externalUrl: data.externalUrl,
        filename: data.title ?? 'Video externo',
        mimeType: 'video/external',
        size: 0,
        altText: data.altText ?? null,
        uploadedById: session.id,
      },
      select: { id: true },
    })

    await recordAudit({
      action: 'CREATE',
      entityType: 'Media',
      entityId: media.id,
      summary: `Video agregado: ${data.externalUrl}`,
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/media')
    return actionOk({ id: media.id })
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function updateMediaAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('media:update')

    const parsed = mediaUpdateSchema.safeParse(input)
    if (!parsed.success) return actionError('VALIDATION_ERROR', 'Datos inválidos.')

    await prisma.media.update({
      where: { id: parsed.data.id },
      data: {
        altText: parsed.data.altText ?? null,
        caption: parsed.data.caption ?? null,
      },
    })

    await recordAudit({
      action: 'UPDATE',
      entityType: 'Media',
      entityId: parsed.data.id,
      summary: 'Metadatos de archivo actualizados',
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/media')
    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
