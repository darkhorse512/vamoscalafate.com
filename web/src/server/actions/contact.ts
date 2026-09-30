'use server'

import { prisma } from '@vamos/db'
import { emailService } from '@vamos/email'
import {
  actionError, actionOk, logger, publicEnv, toPublicError, type ActionResult,
} from '@vamos/shared'
import { checkRateLimit, RATE_LIMITS } from '@vamos/shared/rate-limit'
import { contactSchema } from '@vamos/validation'
import { clientIpFromContext } from '../request'

const log = logger.scoped('action:contact')

export async function submitContactAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ip = await clientIpFromContext()

    const limit = await checkRateLimit(RATE_LIMITS.contact, ip)
    if (!limit.allowed) return actionError('RATE_LIMITED')

    const parsed = contactSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos del formulario.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    // Honeypot. Answer as if accepted so the bot learns nothing.
    if (parsed.data.website) {
      log.warn('Honeypot triggered on contact form', { ip })
      return actionOk({ id: 'discarded' })
    }

    const data = parsed.data

    const submission = await prisma.contactSubmission.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        tourSlug: data.tourSlug || null,
        utmSource: data.utmSource || null,
        utmCampaign: data.utmCampaign || null,
        ipAddress: ip,
      },
      select: { id: true },
    })

    const emailData = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
      tourSlug: data.tourSlug || null,
    }

    // Mail failures are logged inside emailService and never surface as a
    // submission error — the enquiry is already safely stored.
    void emailService.contactAcknowledgement(emailData)
    void emailService.adminContact({ ...emailData, adminUrl: publicEnv.NEXT_PUBLIC_ADMIN_URL })

    log.info('Contact submission stored', { id: submission.id })

    return actionOk({ id: submission.id })
  } catch (error) {
    log.error('Contact submission failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
