'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@vamos/db'
import { emailService } from '@vamos/email'
import {
  actionError, actionOk, logger, publicEnv, toPublicError, uniqueSlug, type ActionResult,
} from '@vamos/shared'
import { submissionReviewSchema } from '@vamos/validation'
import { requirePermission } from '../auth'
import { recordAudit } from '../audit'
import { revalidateEntity } from '../revalidate'

const log = logger.scoped('admin:submissions')

/**
 * Hotel / business submission review (spec §24).
 *
 * The workflow, end to end:
 *   1. applicant submits      → status PENDING, confirmation + admin email
 *   2. admin opens it         → may set UNDER_REVIEW
 *   3. admin needs more info  → NEEDS_INFORMATION, applicant emailed the ask
 *   4. admin rejects          → REJECTED, applicant emailed the reason
 *   5. admin approves         → the Hotel/Business row is CREATED and
 *                               PUBLISHED, and the applicant gets the link
 *
 * Nothing is ever auto-published. Step 5 is the only path from a submission to
 * a public listing.
 */
export async function reviewSubmissionAction(input: unknown): Promise<ActionResult<{ publicUrl?: string }>> {
  try {
    const session = await requirePermission('submissions:update')

    const parsed = submissionReviewSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos de la revisión.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const { submissionId, status, reviewNotes, notifyApplicant } = parsed.data

    const submission = await prisma.hotelSubmission.findUnique({
      where: { id: submissionId },
      include: { hotel: { select: { id: true, slug: true } }, business: { select: { id: true, slug: true } } },
    })

    if (!submission) return actionError('NOT_FOUND', 'La solicitud no existe.')

    const previousStatus = submission.status
    let publicUrl: string | undefined
    let createdSlug: string | undefined

    if (status === 'APPROVED') {
      // Approving twice must not create a second listing.
      if (submission.hotel || submission.business) {
        return actionError('CONFLICT', 'Esta solicitud ya fue aprobada y publicada.')
      }

      const slug = await uniqueSlug(submission.businessName, async (candidate) => {
        const [hotel, business] = await Promise.all([
          prisma.hotel.findUnique({ where: { slug: candidate }, select: { id: true } }),
          prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } }),
        ])
        return Boolean(hotel || business)
      })

      createdSlug = slug

      const destination = await prisma.destination.findFirst({
        where: { slug: 'el-calafate' },
        select: { id: true },
      })

      if (submission.kind === 'HOTEL') {
        await prisma.hotel.create({
          data: {
            slug,
            name: submission.businessName,
            // The applicant's description is the source; an editor refines it
            // afterwards in the hotel editor.
            summary: submission.description.slice(0, 280),
            description: submission.description,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            address: submission.address,
            phone: submission.phone,
            email: submission.email,
            website: submission.website,
            destinationId: destination?.id ?? null,
            submissionId: submission.id,
          },
        })
        publicUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/hoteles/${slug}`
      } else {
        // Business listings need a category; fall back to a general one.
        const category =
          (await prisma.businessCategory.findFirst({
            where: { channel: 'servicios' },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, channel: true, slug: true },
          })) ?? null

        if (!category) {
          return actionError(
            'CONFLICT',
            'No hay categorías de comercio configuradas. Creá una antes de aprobar.',
          )
        }

        await prisma.business.create({
          data: {
            slug,
            name: submission.businessName,
            summary: submission.description.slice(0, 280),
            description: submission.description,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            categoryId: category.id,
            destinationId: destination?.id ?? null,
            address: submission.address,
            phone: submission.phone,
            email: submission.email,
            website: submission.website,
            services: submission.services,
            submissionId: submission.id,
          },
        })

        publicUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/${
          category.channel === 'restaurantes' ? 'restaurantes' : 'servicios'
        }/${slug}`
      }
    }

    await prisma.hotelSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        reviewNotes: reviewNotes ?? null,
        reviewedAt: new Date(),
        reviewedById: session.id,
      },
    })

    await recordAudit({
      action: status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : 'UPDATE',
      entityType: 'HotelSubmission',
      entityId: submissionId,
      summary: `Solicitud ${submission.reference} (${submission.businessName}): ${previousStatus} → ${status}`,
      before: { status: previousStatus },
      after: { status, reviewNotes, publicUrl },
      actorId: session.id,
      actorEmail: session.email,
    })

    if (notifyApplicant) {
      const emailData = {
        reference: submission.reference,
        businessName: submission.businessName,
        contactName: submission.contactName,
        email: submission.email,
        phone: submission.phone,
        kind: submission.kind as 'HOTEL' | 'BUSINESS',
      }

      if (status === 'APPROVED' && publicUrl) {
        void emailService.submissionApproved({ ...emailData, publicUrl })
      } else if (status === 'REJECTED') {
        void emailService.submissionRejected({
          ...emailData,
          reason: reviewNotes ?? 'No cumple los criterios de publicación.',
        })
      } else if (status === 'NEEDS_INFORMATION') {
        void emailService.submissionNeedsInfo({
          ...emailData,
          request: reviewNotes ?? 'Necesitamos información adicional.',
        })
      }
    }

    log.info('Submission reviewed', {
      submissionId, from: previousStatus, to: status, actorId: session.id,
    })

    revalidatePath('/submissions')
    revalidatePath(`/submissions/${submissionId}`)

    if (status === 'APPROVED' && createdSlug) {
      await revalidateEntity(submission.kind === 'HOTEL' ? 'hotel' : 'business', createdSlug)
    }

    return actionOk({ publicUrl })
  } catch (error) {
    log.error('Submission review failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
