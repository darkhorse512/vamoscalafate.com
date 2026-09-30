import nodemailer, { type Transporter } from 'nodemailer'
import { logger, serverEnv, smtpSettings } from '@vamos/shared'

/**
 * Email transport abstraction.
 *
 * Resend is the production provider, reached over SMTP. The interface below is
 * provider-agnostic, so swapping in the Resend HTTP API or another vendor
 * means adding one implementation - no call site changes.
 *
 * REQUIRED EXTERNAL CONFIGURATION before mail will actually deliver:
 *   1. RESEND_SMTP_PASSWORD  - a Resend API key (re_...)
 *   2. EMAIL_TRANSPORT=smtp
 *   3. The sending domain verified at https://resend.com/domains, with the
 *      SPF / DKIM / DMARC records Resend generates published in DNS.
 *
 * Until those exist, EMAIL_TRANSPORT stays "console": messages are logged and
 * nothing is delivered. Delivery is never faked or reported as successful.
 */

const log = logger.scoped('email')

export type EmailMessage = {
  to: string | string[]
  subject: string
  html: string
  text: string
  replyTo?: string
  /** Groups related mail in Resend's dashboard; safe to omit. */
  tags?: Record<string, string>
}

export type SendResult =
  | { delivered: true; messageId: string }
  | { delivered: false; reason: 'not_configured' | 'send_failed'; error?: string }

export interface EmailTransport {
  readonly name: string
  isConfigured(): boolean
  send(message: EmailMessage): Promise<SendResult>
}

/**
 * Development transport. Logs a summary so flows can be exercised without
 * credentials, and reports `delivered: false` - never pretends mail was sent.
 */
class ConsoleTransport implements EmailTransport {
  readonly name = 'console'

  isConfigured(): boolean {
    return true
  }

  async send(message: EmailMessage): Promise<SendResult> {
    log.info('Email NOT sent (EMAIL_TRANSPORT=console)', {
      to: message.to,
      subject: message.subject,
      preview: message.text.slice(0, 200),
    })
    return { delivered: false, reason: 'not_configured' }
  }
}

class SmtpTransport implements EmailTransport {
  readonly name = 'smtp'
  private transporter: Transporter | null = null

  isConfigured(): boolean {
    return smtpSettings() !== null
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter

    const settings = smtpSettings()
    if (!settings) {
      throw new Error('SMTP is selected but no credentials are configured')
    }

    this.transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.user, pass: settings.password },
      // Pooled: a burst of booking confirmations should reuse connections
      // rather than open one per message, which some hosts rate-limit.
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: { rejectUnauthorized: settings.rejectUnauthorized },
    })

    return this.transporter
  }

  /** Confirms the server accepts the credentials. Used by the admin's test. */
  async verify(): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!this.isConfigured()) return { ok: false, error: 'No SMTP credentials configured' }
    try {
      await this.getTransporter().verify()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  async send(message: EmailMessage): Promise<SendResult> {
    if (!this.isConfigured()) {
      log.warn('RESEND_SMTP_PASSWORD is not set - email not sent', { subject: message.subject })
      return { delivered: false, reason: 'not_configured' }
    }

    const env = serverEnv()

    try {
      const info = await this.getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo ?? env.EMAIL_REPLY_TO,
        headers: message.tags
          ? Object.fromEntries(
              Object.entries(message.tags).map(([k, v]) => [`X-Entity-${k}`, v]),
            )
          : undefined,
      })

      log.info('Email delivered', { to: message.to, subject: message.subject, messageId: info.messageId })
      return { delivered: true, messageId: info.messageId }
    } catch (error) {
      // A failed notification must never roll back the booking it describes.
      // Log loudly, return the failure, and let the caller carry on.
      log.error('Email delivery failed', error, { to: message.to, subject: message.subject })
      return {
        delivered: false,
        reason: 'send_failed',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

let cached: EmailTransport | null = null

export function getTransport(): EmailTransport {
  if (cached) return cached
  cached = serverEnv().EMAIL_TRANSPORT === 'smtp' ? new SmtpTransport() : new ConsoleTransport()
  return cached
}

/** Test seam: inject a fake transport. */
export function setTransport(transport: EmailTransport | null): void {
  cached = transport
}

/**
 * Sends a test message to confirm the configuration end to end.
 *
 * Reports honestly: a transport that is not configured returns
 * `delivered: false`, never a fabricated success.
 */
export async function sendTestEmail(to: string): Promise<SendResult> {
  const env = serverEnv()

  return getTransport().send({
    to,
    subject: 'Prueba de configuración — Vamos Calafate',
    text:
      'Si estás leyendo esto, el envío de correo está configurado correctamente.\n\n' +
      `Remitente: ${env.EMAIL_FROM}\n` +
      `Servidor: ${smtpSettings()?.host ?? 'no configurado'}\n`,
    html:
      '<p>Si estás leyendo esto, el envío de correo está configurado correctamente.</p>' +
      `<p><strong>Remitente:</strong> ${env.EMAIL_FROM}<br />` +
      `<strong>Servidor:</strong> ${smtpSettings()?.host ?? 'no configurado'}</p>`,
  })
}
