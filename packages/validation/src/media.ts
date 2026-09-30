import { z } from 'zod'
import { cuidSchema, urlSchema } from './common.ts'

/**
 * Upload constraints.
 *
 * Only these MIME types are accepted, and the server additionally sniffs the
 * file's magic bytes - a client-declared Content-Type is attacker-controlled
 * and must never be the only check. SVG is deliberately excluded: it can carry
 * script and would be a stored-XSS vector when served from our own origin.
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const

export const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf'] as const

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024 // 8 MB
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024 // 10 MB

export const mediaUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Nombre de archivo requerido')
    .max(200)
    // Blocks path traversal and NUL bytes in the stored key.
    .refine((v) => !v.includes('/') && !v.includes('\\') && !v.includes('\0'), 'Nombre inválido'),
  mimeType: z.enum([...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_DOCUMENT_MIME_TYPES], {
    message: 'Tipo de archivo no permitido. Usá JPG, PNG, WebP, AVIF o PDF.',
  }),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_DOCUMENT_BYTES, 'El archivo supera el tamaño máximo permitido'),
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
})

export const mediaUpdateSchema = z.object({
  id: cuidSchema,
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
})

/** Video is referenced by URL - the platform does not host video files. */
export const mediaVideoSchema = z.object({
  externalUrl: urlSchema.refine(
    (v) => /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(v),
    'Solo se admiten enlaces de YouTube o Vimeo',
  ),
  title: z.string().max(200).optional(),
  altText: z.string().max(300).optional(),
})

/** Magic-byte signatures, checked server-side against the declared MIME type. */
export const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // WebP and AVIF are RIFF/ISOBMFF containers: the tag sits after a 4-byte
  // length field, so the first four bytes are checked and the brand verified
  // separately in the upload handler.
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
  'image/avif': [[0x00, 0x00, 0x00]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
}

export function matchesSignature(bytes: Uint8Array, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType]
  if (!signatures) return false

  const matchesPrefix = signatures.some((sig) =>
    sig.every((byte, index) => bytes[index] === byte),
  )
  if (!matchesPrefix) return false

  // RIFF containers: confirm the WEBP brand at offset 8.
  if (mimeType === 'image/webp') {
    return (
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    )
  }
  // ISOBMFF: confirm the `ftyp` box and an AVIF brand.
  if (mimeType === 'image/avif') {
    const isFtyp =
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    if (!isFtyp) return false
    const brand = String.fromCharCode(...Array.from(bytes.slice(8, 12)))
    return brand === 'avif' || brand === 'avis'
  }

  return true
}
