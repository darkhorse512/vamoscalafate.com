import { SITE } from '@vamos/shared'
import { renderEmail, renderText, type EmailSection } from './layout.ts'

export type SubmissionEmailData = {
  reference: string
  businessName: string
  contactName: string
  email: string
  phone: string
  kind: 'HOTEL' | 'BUSINESS'
}

function build(title: string, intro: string, sections: EmailSection[], preview: string, footer?: string) {
  return {
    subject: title,
    html: renderEmail({ previewText: preview, title, intro, sections, footerNote: footer }),
    text: renderText({ title, intro, sections, footerNote: footer }),
  }
}

const kindLabel = (kind: 'HOTEL' | 'BUSINESS') => (kind === 'HOTEL' ? 'Hotel / alojamiento' : 'Comercio / servicio')

/** 1 — Acknowledgement to the applicant. */
export function submissionReceivedEmail(data: SubmissionEmailData) {
  return build(
    `Recibimos tu solicitud — ${data.reference}`,
    `Hola ${data.contactName}, recibimos la solicitud de alta de ${data.businessName} en la guía de Vamos Calafate.`,
    [
      {
        kind: 'details',
        rows: [
          { label: 'Referencia', value: data.reference },
          { label: 'Establecimiento', value: data.businessName },
          { label: 'Tipo', value: kindLabel(data.kind) },
          { label: 'Estado', value: 'Pendiente de revisión' },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        text: 'Las solicitudes no se publican automáticamente: nuestro equipo revisa cada una antes de publicarla.',
      },
      { kind: 'heading', text: 'Próximo paso' },
      {
        kind: 'paragraph',
        text: 'Revisamos la información y te escribimos a este correo con el resultado. Si necesitamos algún dato adicional, te lo pedimos por esta misma vía.',
      },
    ],
    `Solicitud ${data.reference} recibida`,
    'Conservá la referencia para cualquier consulta sobre tu solicitud.',
  )
}

/** 2 — Internal notification to staff. */
export function adminNewSubmissionEmail(
  data: SubmissionEmailData & { adminUrl: string; submissionId: string; description: string },
) {
  return build(
    `Nueva solicitud de alta — ${data.businessName}`,
    `${data.contactName} envió una solicitud para publicar ${data.businessName}.`,
    [
      {
        kind: 'details',
        rows: [
          { label: 'Referencia', value: data.reference },
          { label: 'Tipo', value: kindLabel(data.kind) },
          { label: 'Contacto', value: data.contactName },
          { label: 'Email', value: data.email },
          { label: 'Teléfono', value: data.phone },
        ],
      },
      { kind: 'heading', text: 'Descripción enviada' },
      { kind: 'paragraph', text: data.description.slice(0, 600) },
      {
        kind: 'button',
        button: { label: 'Revisar solicitud', url: `${data.adminUrl}/submissions/${data.submissionId}` },
      },
    ],
    `Solicitud pendiente: ${data.businessName}`,
  )
}

/** 3 — Approved and published. */
export function submissionApprovedEmail(data: SubmissionEmailData & { publicUrl: string }) {
  return build(
    `${data.businessName} ya está publicado`,
    `Hola ${data.contactName}, aprobamos tu solicitud y la ficha ya está publicada en Vamos Calafate.`,
    [
      {
        kind: 'details',
        rows: [
          { label: 'Referencia', value: data.reference },
          { label: 'Establecimiento', value: data.businessName },
          { label: 'Estado', value: 'Publicado' },
        ],
      },
      { kind: 'button', button: { label: 'Ver tu ficha', url: data.publicUrl } },
      {
        kind: 'paragraph',
        text: 'Si necesitás actualizar fotos, horarios o datos de contacto, respondé este correo indicando la referencia.',
      },
    ],
    `Publicado: ${data.businessName}`,
  )
}

/** 4 — Rejected, with the reason. */
export function submissionRejectedEmail(data: SubmissionEmailData & { reason: string }) {
  return build(
    `Sobre tu solicitud ${data.reference}`,
    `Hola ${data.contactName}, revisamos la solicitud de ${data.businessName} y por ahora no podemos publicarla.`,
    [
      { kind: 'heading', text: 'Motivo' },
      { kind: 'paragraph', text: data.reason },
      {
        kind: 'paragraph',
        text: 'Si la situación cambia o querés enviar información corregida, podés presentar una nueva solicitud.',
      },
      { kind: 'button', button: { label: 'Enviar nueva solicitud', url: `${SITE.url}/hoteles/registrar` } },
    ],
    `Solicitud ${data.reference} no aprobada`,
  )
}

/** 5 — More information required before a decision. */
export function submissionNeedsInfoEmail(data: SubmissionEmailData & { request: string }) {
  return build(
    `Necesitamos algunos datos más — ${data.reference}`,
    `Hola ${data.contactName}, para avanzar con la publicación de ${data.businessName} necesitamos información adicional.`,
    [
      { kind: 'heading', text: 'Qué necesitamos' },
      { kind: 'paragraph', text: data.request },
      {
        kind: 'callout',
        tone: 'warning',
        text: `Respondé este correo incluyendo la referencia ${data.reference} y retomamos la revisión.`,
      },
    ],
    `Información pendiente — ${data.reference}`,
  )
}
