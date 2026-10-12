import type { Metadata } from 'next'
import { Briefcase, CalendarClock, FileText, Handshake, Mail, Users } from 'lucide-react'
import { CONTACT, ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ContactForm } from '@/components/content/ContactForm'
import { PageBanner } from '@/components/marketing/PageBanner'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Agencias de viajes y operadores',
  description:
    'Trabajamos con agencias de viajes, operadores y receptivos que venden excursiones en El Calafate: cupos, confirmaciones y facturación. Escribinos para abrir una cuenta.',
  path: ROUTES.agencies,
})

/**
 * Business-to-business enquiry page.
 *
 * It deliberately quotes no commission, no net rate and no cupo: those are
 * commercial terms the operator negotiates per agency, and publishing a figure
 * here would commit them to something they never agreed. The page explains how
 * the relationship works and opens an enquiry.
 */
const POINTS = [
  {
    icon: Handshake,
    title: 'Cuenta de agencia',
    description:
      'Abrimos una cuenta a tu nombre y acordamos las condiciones comerciales por escrito antes de la primera venta.',
  },
  {
    icon: CalendarClock,
    title: 'Cupos y confirmaciones',
    description:
      'Consultás disponibilidad y bloqueás lugares para tus pasajeros. Cada reserva se confirma con la referencia de la excursión, la fecha y el horario de búsqueda.',
  },
  {
    icon: FileText,
    title: 'Facturación',
    description:
      'Emitimos factura a nombre de la agencia, con el detalle de cada servicio prestado y de los pasajeros.',
  },
  {
    icon: Users,
    title: 'Grupos y series',
    description:
      'Si trabajás con grupos, series o charters, coordinamos la operación completa: traslados, guías y horarios.',
  },
]

export default function AgenciasPage() {
  return (
    <>
      <PageBanner imageSlug="glaciar-perito-moreno">
        <Breadcrumbs
          tone="light"
          items={[
            { name: 'Inicio', path: '/' },
            { name: 'Agencias', path: ROUTES.agencies },
          ]}
        />
        <SectionHeading
          tone="light"
          as="h1"
          eyebrow="Para profesionales del turismo"
          title="Agencias de viajes y operadores"
          description="Si vendés El Calafate desde otra ciudad o desde el exterior, operamos las excursiones por vos: glaciares, navegaciones, trekking y traslados."
          className="mt-5"
        />
      </PageBanner>

      <div className="container-page py-12 sm:py-16">
        <ul className="grid gap-6 sm:grid-cols-2">
          {POINTS.map((point) => (
            <li key={point.title} className="rounded-card border border-border bg-surface p-6 shadow-subtle">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary" aria-hidden="true">
                <point.icon className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold text-heading">{point.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{point.description}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
          <div>
            <SectionHeading
              as="h2"
              eyebrow="Escribinos"
              title="Abrir una cuenta de agencia"
              description="Contanos desde dónde operás, qué volumen manejás y qué excursiones te interesan. Te respondemos con las condiciones vigentes."
            />
            <div className="mt-8">
              <ContactForm
                defaultSubject="Agencias y operadores"
                defaultMessage={
                  'Agencia / operador:\n' +
                  'Ciudad y país:\n' +
                  'CUIT o identificación fiscal:\n' +
                  'Excursiones que nos interesan:\n' +
                  'Volumen aproximado por temporada:\n'
                }
              />
            </div>
          </div>

          <aside className="mt-10 lg:mt-0">
            <div className="rounded-card border border-border bg-surface-muted p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-heading">
                <Briefcase className="size-4 text-primary" aria-hidden="true" />
                Contacto comercial
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                También podés escribirnos directamente y te derivamos al área comercial.
              </p>
              <a
                href={`mailto:${CONTACT.email}?subject=${encodeURIComponent('Consulta de agencia')}`}
                className="mt-4 inline-flex items-center gap-2 break-all text-sm font-semibold text-primary hover:underline"
              >
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                {CONTACT.email}
              </a>
            </div>

            <div className="mt-4 rounded-card border border-border p-5">
              <h2 className="font-sans text-sm font-bold text-heading">¿Viajás con un grupo?</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Si no sos agencia pero venís en familia o con un grupo, la consulta va por otro lado.
              </p>
              <a
                href={ROUTES.groups}
                className="mt-3 inline-block text-[0.8125rem] font-semibold text-primary underline underline-offset-2"
              >
                Grupos y familias
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
