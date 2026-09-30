import { renderEmail, renderText, type EmailSection } from './layout.ts'

export type ContactEmailData = {
  name: string
  email: string
  phone?: string | null
  subject: string
  message: string
  tourSlug?: string | null
}

function build(title: string, intro: string, sections: EmailSection[], preview: string, footer?: string) {
  return {
    subject: title,
    html: renderEmail({ previewText: preview, title, intro, sections, footerNote: footer }),
    text: renderText({ title, intro, sections, footerNote: footer }),
  }
}

/** Acknowledgement to the person who wrote in. */
export function contactAcknowledgementEmail(data: ContactEmailData) {
  return build(
    'Recibimos tu consulta',
    `Hola ${data.name}, gracias por escribirnos. Recibimos tu mensaje y te respondemos a la brevedad.`,
    [
      { kind: 'heading', text: 'Tu consulta' },
      { kind: 'details', rows: [{ label: 'Asunto', value: data.subject }] },
      { kind: 'paragraph', text: data.message },
      {
        kind: 'callout',
        tone: 'info',
        text: 'Respondemos de lunes a sábado. Si tu consulta es urgente, escribinos por WhatsApp.',
      },
    ],
    'Recibimos tu consulta',
    'Este correo confirma la recepción del mensaje; no hace falta que respondas.',
  )
}

/** Internal notification with a working reply-to. */
export function adminContactEmail(data: ContactEmailData & { adminUrl: string }) {
  return build(
    `Nueva consulta: ${data.subject}`,
    `${data.name} (${data.email}) envió una consulta desde el sitio.`,
    [
      {
        kind: 'details',
        rows: [
          { label: 'Nombre', value: data.name },
          { label: 'Email', value: data.email },
          ...(data.phone ? [{ label: 'Teléfono', value: data.phone }] : []),
          ...(data.tourSlug ? [{ label: 'Excursión', value: data.tourSlug }] : []),
        ],
      },
      { kind: 'heading', text: 'Mensaje' },
      { kind: 'paragraph', text: data.message },
    ],
    `Consulta de ${data.name}`,
    'Respondé directamente a este correo para contestarle al cliente.',
  )
}

/** Generic operational alert for staff. */
export function adminSystemAlertEmail(data: {
  title: string
  summary: string
  details?: { label: string; value: string }[]
  actionUrl?: string
  actionLabel?: string
}) {
  const sections: EmailSection[] = [
    { kind: 'callout', tone: 'danger', text: data.summary },
    ...(data.details?.length ? ([{ kind: 'details', rows: data.details }] as EmailSection[]) : []),
    ...(data.actionUrl
      ? ([
          {
            kind: 'button',
            button: { label: data.actionLabel ?? 'Abrir el panel', url: data.actionUrl },
          },
        ] as EmailSection[])
      : []),
  ]

  return build(data.title, 'Notificación automática del sistema.', sections, data.title)
}
