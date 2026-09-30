import { logger, serverEnv } from '@vamos/shared'
import { getTransport, type SendResult } from './transport.ts'
import {
  adminNewBookingEmail,
  adminPaymentProblemEmail,
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingReceivedEmail,
  paymentReceivedEmail,
  refundProcessedEmail,
  type BookingEmailData,
} from './templates/booking.ts'
import {
  adminNewSubmissionEmail,
  submissionApprovedEmail,
  submissionNeedsInfoEmail,
  submissionReceivedEmail,
  submissionRejectedEmail,
  type SubmissionEmailData,
} from './templates/submission.ts'
import {
  adminContactEmail,
  adminSystemAlertEmail,
  contactAcknowledgementEmail,
  type ContactEmailData,
} from './templates/contact.ts'

export * from './transport.ts'
export * from './templates/layout.ts'
export type { BookingEmailData, SubmissionEmailData, ContactEmailData }

const log = logger.scoped('email-service')

type Rendered = { subject: string; html: string; text: string }

/**
 * Central send helper.
 *
 * Every send is wrapped so a mail failure can never abort the transaction that
 * triggered it - losing a confirmation email is recoverable, losing a paid
 * booking is not. Failures are logged and returned, never thrown.
 */
async function deliver(to: string | string[], rendered: Rendered, tags?: Record<string, string>): Promise<SendResult> {
  try {
    return await getTransport().send({ to, ...rendered, tags })
  } catch (error) {
    log.error('Unexpected error while sending email', error, { subject: rendered.subject })
    return {
      delivered: false,
      reason: 'send_failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function adminRecipient(): string | null {
  const env = serverEnv()
  return env.EMAIL_ADMIN ?? null
}

async function deliverToAdmin(rendered: Rendered, tags?: Record<string, string>): Promise<SendResult> {
  const to = adminRecipient()
  if (!to) {
    log.warn('EMAIL_ADMIN is not configured - internal notification skipped', {
      subject: rendered.subject,
    })
    return { delivered: false, reason: 'not_configured' }
  }
  return deliver(to, rendered, tags)
}

// ── Booking ─────────────────────────────────────────────────────────────────

export const emailService = {
  bookingReceived: (data: BookingEmailData) =>
    deliver(data.customerEmail, bookingReceivedEmail(data), { booking: data.reference }),

  paymentReceived: (data: BookingEmailData & { paidAmountCents: number }) =>
    deliver(data.customerEmail, paymentReceivedEmail(data), { booking: data.reference }),

  bookingConfirmed: (data: BookingEmailData) =>
    deliver(data.customerEmail, bookingConfirmedEmail(data), { booking: data.reference }),

  bookingCancelled: (data: BookingEmailData & { reason?: string | null }) =>
    deliver(data.customerEmail, bookingCancelledEmail(data), { booking: data.reference }),

  refundProcessed: (data: BookingEmailData & { refundedCents: number; providerLabel: string }) =>
    deliver(data.customerEmail, refundProcessedEmail(data), { booking: data.reference }),

  adminNewBooking: (data: BookingEmailData & { adminUrl: string; bookingId: string }) =>
    deliverToAdmin(adminNewBookingEmail(data), { booking: data.reference }),

  adminPaymentProblem: (data: Parameters<typeof adminPaymentProblemEmail>[0]) =>
    deliverToAdmin(adminPaymentProblemEmail(data), { booking: data.reference }),

  // ── Submissions ───────────────────────────────────────────────────────────

  submissionReceived: (data: SubmissionEmailData) =>
    deliver(data.email, submissionReceivedEmail(data), { submission: data.reference }),

  adminNewSubmission: (
    data: SubmissionEmailData & { adminUrl: string; submissionId: string; description: string },
  ) => deliverToAdmin(adminNewSubmissionEmail(data), { submission: data.reference }),

  submissionApproved: (data: SubmissionEmailData & { publicUrl: string }) =>
    deliver(data.email, submissionApprovedEmail(data), { submission: data.reference }),

  submissionRejected: (data: SubmissionEmailData & { reason: string }) =>
    deliver(data.email, submissionRejectedEmail(data), { submission: data.reference }),

  submissionNeedsInfo: (data: SubmissionEmailData & { request: string }) =>
    deliver(data.email, submissionNeedsInfoEmail(data), { submission: data.reference }),

  // ── Contact ───────────────────────────────────────────────────────────────

  contactAcknowledgement: (data: ContactEmailData) =>
    deliver(data.email, contactAcknowledgementEmail(data)),

  adminContact: (data: ContactEmailData & { adminUrl: string }) =>
    deliverToAdmin(adminContactEmail(data)),

  adminSystemAlert: (data: Parameters<typeof adminSystemAlertEmail>[0]) =>
    deliverToAdmin(adminSystemAlertEmail(data)),
}

export type EmailService = typeof emailService
