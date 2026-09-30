'use server'

import { randomBytes } from 'node:crypto'
import { prisma } from '@vamos/db'
import { emailService } from '@vamos/email'
import {
  actionError, actionOk, logger, publicEnv, toPublicError, type ActionResult,
} from '@vamos/shared'
import { checkRateLimit, RATE_LIMITS } from '@vamos/shared/rate-limit'
import { hotelSubmissionSchema } from '@vamos/validation'
import { clientIpFromContext } from '../request'

const log = logger.scoped('action:submission')

function generateReference(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTVWXYZ'
  const bytes = randomBytes(5)
  let out = ''
  for (const byte of bytes) out += alphabet[byte % alphabet.length]
  return `VC-S-${out}`
}

/**
 * Public hotel / business listing request.
 *
 * Nothing here publishes anything. The row is created with status PENDING and
 * an administrator must approve it before a public listing exists - that is
 * the whole point of the workflow in spec §23.
 *
 * Supplied image and video URLs are stored as plain strings and never fetched
 * server-side, which removes an SSRF surface.
 */
export async function submitHotelListingAction(
  input: unknown,
): Promise<ActionResult<{ reference: string }>> {
  try {
    const ip = await clientIpFromContext()

    const limit = await checkRateLimit(RATE_LIMITS.submission, ip)
    if (!limit.allowed) return actionError('RATE_LIMITED')

    const parsed = hotelSubmissionSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos del formulario.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    if (parsed.data.website_hp) {
      log.warn('Honeypot triggered on submission form', { ip })
      return actionOk({ reference: 'discarded' })
    }

    const data = parsed.data
    const reference = generateReference()

    const submission = await prisma.hotelSubmission.create({
      data: {
        reference,
        kind: data.kind,
        status: 'PENDING',
        businessName: data.businessName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        website: data.website || null,
        address: data.address || null,
        description: data.description,
        amenities: data.amenities,
        services: data.services,
        openingHours: data.openingHours || null,
        imageUrls: data.imageUrls,
        videoUrls: data.videoUrls,
        extraInfo: data.extraInfo || null,
        ipAddress: ip,
      },
      select: { id: true, reference: true },
    })

    const emailData = {
      reference: submission.reference,
      businessName: data.businessName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      kind: data.kind,
    }

    void emailService.submissionReceived(emailData)
    void emailService.adminNewSubmission({
      ...emailData,
      adminUrl: publicEnv.NEXT_PUBLIC_ADMIN_URL,
      submissionId: submission.id,
      description: data.description,
    })

    log.info('Listing submission stored', { id: submission.id, reference: submission.reference })

    return actionOk({ reference: submission.reference })
  } catch (error) {
    log.error('Listing submission failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
