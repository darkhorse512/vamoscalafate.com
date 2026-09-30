import { formatDate, formatMoney, SITE } from '@vamos/shared'
import { renderEmail, renderText, type EmailSection } from './layout.ts'

/** Data a booking email needs. Deliberately flat so callers stay decoupled. */
export type BookingEmailData = {
  reference: string
  customerName: string
  customerEmail: string
  tourName: string
  optionName: string
  travelDate: Date | string
  departureTime?: string | null
  adults: number
  children: number
  pickupLocation?: string | null
  totalCents: number
  currency: string
  specialRequests?: string | null
}

function bookingDetailRows(data: BookingEmailData) {
  const passengers = [
    `${data.adults} ${data.adults === 1 ? 'adulto' : 'adultos'}`,
    ...(data.children > 0 ? [`${data.children} ${data.children === 1 ? 'menor' : 'menores'}`] : []),
  ].join(' · ')

  return [
    { label: 'Referencia', value: data.reference },
    { label: 'Excursión', value: data.tourName },
    { label: 'Opción', value: data.optionName },
    { label: 'Fecha', value: formatDate(data.travelDate) },
    ...(data.departureTime ? [{ label: 'Horario', value: data.departureTime }] : []),
    { label: 'Pasajeros', value: passengers },
    ...(data.pickupLocation ? [{ label: 'Punto de encuentro', value: data.pickupLocation }] : []),
    { label: 'Total', value: formatMoney(data.totalCents, data.currency) },
  ]
}

function build(
  title: string,
  intro: string,
  sections: EmailSection[],
  previewText: string,
  footerNote?: string,
) {
  return {
    subject: title,
    html: renderEmail({ previewText, title, intro, sections, footerNote }),
    text: renderText({ title, intro, sections, footerNote }),
  }
}

/** 1 - Booking received, before payment. */
export function bookingReceivedEmail(data: BookingEmailData) {
  return build(
    `Recibimos tu solicitud de reserva ${data.reference}`,
    `Hola ${data.customerName}, registramos tu solicitud. Todavía no está confirmada: se confirma una vez acreditado el pago.`,
    [
      { kind: 'details', rows: bookingDetailRows(data) },
      {
        kind: 'callout',
        tone: 'warning',
        text: 'Tu reserva aún no está confirmada. Completá el pago para asegurar tu lugar.',
      },
      ...(data.specialRequests
        ? ([
            { kind: 'heading', text: 'Tu comentario' },
            { kind: 'paragraph', text: data.specialRequests },
          ] as EmailSection[])
        : []),
      { kind: 'paragraph', text: 'Si tenés dudas, respondé este correo y te ayudamos.' },
    ],
    `Solicitud ${data.reference} registrada`,
    'Guardá este correo: la referencia te identifica en cualquier consulta.',
  )
}

/** 2 - Payment received, awaiting operational confirmation. */
export function paymentReceivedEmail(data: BookingEmailData & { paidAmountCents: number }) {
  return build(
    `Recibimos tu pago - reserva ${data.reference}`,
    `Hola ${data.customerName}, acreditamos tu pago de ${formatMoney(data.paidAmountCents, data.currency)}.`,
    [
      { kind: 'details', rows: bookingDetailRows(data) },
      {
        kind: 'callout',
        tone: 'info',
        text: 'Estamos confirmando la disponibilidad con el operador. Te escribimos apenas esté confirmada.',
      },
    ],
    `Pago acreditado - ${data.reference}`,
  )
}

/** 3 - Booking confirmed: the operationally meaningful message. */
export function bookingConfirmedEmail(data: BookingEmailData) {
  return build(
    `Reserva confirmada - ${data.reference}`,
    `Hola ${data.customerName}, tu reserva está confirmada. Te esperamos en El Calafate.`,
    [
      { kind: 'details', rows: bookingDetailRows(data) },
      { kind: 'heading', text: 'Antes de tu excursión' },
      {
        kind: 'paragraph',
        text: 'Presentate en el punto de encuentro 10 minutos antes del horario indicado y llevá un documento de identidad.',
      },
      {
        kind: 'paragraph',
        text: 'El clima en Patagonia cambia rápido: llevá abrigo, campera rompeviento, calzado cerrado y protector solar, incluso en verano.',
      },
      {
        kind: 'callout',
        tone: 'success',
        text: `Mostrá la referencia ${data.reference} al momento del encuentro.`,
      },
      { kind: 'button', button: { label: 'Ver más experiencias', url: `${SITE.url}/excursiones` } },
    ],
    `Confirmada: ${data.tourName}`,
    'Si necesitás modificar tu reserva, respondé este correo lo antes posible.',
  )
}

/** 4 - Cancellation. */
export function bookingCancelledEmail(data: BookingEmailData & { reason?: string | null }) {
  return build(
    `Reserva cancelada - ${data.reference}`,
    `Hola ${data.customerName}, tu reserva fue cancelada.`,
    [
      { kind: 'details', rows: bookingDetailRows(data) },
      ...(data.reason
        ? ([{ kind: 'callout', tone: 'info', text: `Motivo: ${data.reason}` }] as EmailSection[])
        : []),
      {
        kind: 'paragraph',
        text: 'Si corresponde un reembolso según la política de cancelación, lo procesamos por el mismo medio de pago y te avisamos cuando esté hecho.',
      },
      {
        kind: 'button',
        button: { label: 'Ver política de cancelación', url: `${SITE.url}/politica-de-cancelacion` },
      },
    ],
    `Cancelada: ${data.reference}`,
  )
}

/** 5 - Refund processed. */
export function refundProcessedEmail(
  data: BookingEmailData & { refundedCents: number; providerLabel: string },
) {
  return build(
    `Reembolso procesado - ${data.reference}`,
    `Hola ${data.customerName}, procesamos el reembolso de tu reserva.`,
    [
      {
        kind: 'details',
        rows: [
          { label: 'Referencia', value: data.reference },
          { label: 'Excursión', value: data.tourName },
          { label: 'Importe reembolsado', value: formatMoney(data.refundedCents, data.currency) },
          { label: 'Medio', value: data.providerLabel },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        text: 'Según tu banco o emisor, el importe puede tardar entre 5 y 15 días hábiles en verse reflejado.',
      },
    ],
    `Reembolso enviado - ${data.reference}`,
  )
}

/** 6 - Internal: new booking notification for staff. */
export function adminNewBookingEmail(
  data: BookingEmailData & { adminUrl: string; bookingId: string },
) {
  return build(
    `Nueva reserva ${data.reference} - ${data.tourName}`,
    `${data.customerName} (${data.customerEmail}) generó una reserva.`,
    [
      { kind: 'details', rows: bookingDetailRows(data) },
      {
        kind: 'button',
        button: { label: 'Abrir en el panel', url: `${data.adminUrl}/bookings/${data.bookingId}` },
      },
    ],
    `Nueva reserva: ${data.reference}`,
  )
}

/** 7 - Internal: payment problem needing manual attention. */
export function adminPaymentProblemEmail(data: {
  reference: string
  bookingId: string
  adminUrl: string
  provider: string
  reason: string
  amountCents: number
  currency: string
}) {
  return build(
    `Problema de pago - reserva ${data.reference}`,
    'Un pago no pudo completarse y requiere revisión manual.',
    [
      {
        kind: 'details',
        rows: [
          { label: 'Referencia', value: data.reference },
          { label: 'Proveedor', value: data.provider },
          { label: 'Importe', value: formatMoney(data.amountCents, data.currency) },
          { label: 'Motivo', value: data.reason },
        ],
      },
      {
        kind: 'callout',
        tone: 'danger',
        text: 'Revisá la reserva antes de liberar o retener los lugares.',
      },
      {
        kind: 'button',
        button: { label: 'Abrir reserva', url: `${data.adminUrl}/bookings/${data.bookingId}` },
      },
    ],
    `Pago con problemas - ${data.reference}`,
  )
}
