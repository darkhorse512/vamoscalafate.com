import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AppError, logger, serverEnv } from '@vamos/shared'
import { matchesSignature } from '@vamos/validation'

const log = logger.scoped('storage')

/**
 * Media storage abstraction.
 *
 * `local` writes under STORAGE_LOCAL_DIR, which Nginx serves directly - far
 * more efficient than proxying every image through Node.
 *
 * The interface is deliberately narrow (put / remove / urlFor) so swapping in
 * S3, Cloudflare R2 or any S3-compatible provider means adding one
 * implementation, with no call-site changes (spec §25).
 *
 * NOTE: the S3 driver is NOT implemented. Selecting STORAGE_DRIVER="s3"
 * raises a clear error rather than silently falling back to local disk - a
 * silent fallback would mean uploads landing on a VPS the operator believes
 * is stateless.
 */

export interface StorageDriver {
  readonly name: string
  put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>
  urlFor(key: string): string
}

class LocalStorageDriver implements StorageDriver {
  readonly name = 'local'

  async put(key: string, data: Buffer): Promise<{ url: string }> {
    const env = serverEnv()
    const target = path.join(env.STORAGE_LOCAL_DIR, key)

    // Defence in depth: `key` is built by buildStorageKey() below, but a path
    // that escapes the storage root must never be writable.
    const resolvedRoot = path.resolve(env.STORAGE_LOCAL_DIR)
    const resolvedTarget = path.resolve(target)
    if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid storage key')
    }

    await mkdir(path.dirname(resolvedTarget), { recursive: true })
    await writeFile(resolvedTarget, data)

    log.info('Stored media file', { key, bytes: data.byteLength })

    return { url: this.urlFor(key) }
  }

  urlFor(key: string): string {
    const base = serverEnv().STORAGE_PUBLIC_URL.replace(/\/$/, '')
    return `${base}/${key}`
  }
}

let cached: StorageDriver | null = null

export function getStorage(): StorageDriver {
  if (cached) return cached

  const driver = serverEnv().STORAGE_DRIVER

  if (driver === 's3') {
    throw new AppError(
      'PROVIDER_NOT_CONFIGURED',
      'STORAGE_DRIVER="s3" is selected but no S3 driver is implemented. ' +
        'Implement StorageDriver against your bucket, or set STORAGE_DRIVER="local".',
      {
        publicMessage:
          'El almacenamiento S3 no está implementado. Configurá STORAGE_DRIVER="local" o implementá el driver.',
      },
    )
  }

  cached = new LocalStorageDriver()
  return cached
}

/**
 * Builds a storage key: `yyyy/mm/<uuid>.<ext>`.
 *
 * The original filename is NEVER used in the path. It is attacker-controlled,
 * may contain traversal sequences or unicode tricks, and could collide. It is
 * preserved as metadata on the Media row for display only.
 */
export function buildStorageKey(originalName: string, mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'application/pdf': 'pdf',
  }

  const extension = extensions[mimeType] ?? 'bin'
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')

  return `${year}/${month}/${randomUUID()}.${extension}`
}

/**
 * Validates an upload's real content type.
 *
 * The browser-supplied Content-Type is a hint, not evidence: a PHP script
 * renamed to .jpg would declare image/jpeg. The magic bytes are checked
 * against the declared type, and a mismatch is rejected.
 */
export function verifyFileContent(buffer: Buffer, declaredMimeType: string): void {
  const header = new Uint8Array(buffer.subarray(0, 16))

  if (!matchesSignature(header, declaredMimeType)) {
    log.warn('Upload rejected: content does not match declared type', {
      declaredMimeType,
      firstBytes: Array.from(header.slice(0, 8)),
    })
    throw new AppError('VALIDATION_ERROR', 'File content does not match its declared type', {
      publicMessage: 'El archivo no coincide con el tipo declarado. Subí una imagen válida.',
    })
  }
}

/** Content hash, for de-duplicating identical uploads. */
export function contentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 32)
}
