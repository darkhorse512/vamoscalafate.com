import type { Metadata } from 'next'
import { CalendarDays, Heart, Mail, MessageCircle, Users } from 'lucide-react'
import { CONTACT, ROUTES, whatsappUrl } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ContactForm } from '@/components/content/ContactForm'
import { PageBanner } from '@/components/marketing/PageBanner'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Grupos y familias',
  description:
    'Si viajás en familia o con un grupo de tres o más personas a El Calafate, armamos el itinerario y te pasamos una cotización con las bonificaciones que correspondan.',
  path: ROUTES.groups,
})

/**
 * Group enquiry page.
 *
 * No percentage is printed anywhere on this page, and that is deliberate. What
 * a group pays depends on the size of the party, the excursions chosen and the
 * date, and the operator quotes it case by case. Advertising "20% off" here and
 * then quoting something else would be the kind of bait the rest of this site
 * is built to avoid.
 */
const POINTS = [
  {
    icon: Users,
    title: 'Desde tres personas',
    description:
      'A partir de tres pasajeros cotizamos el conjunto de excursiones y te decimos qué bonificación corresponde en esa fecha.',
  },
  {
    icon: Heart,
    title: 'Familias',
    description:
      'Tenemos tarifas de menores en casi todas las excursiones. Contanos las edades y las incluimos en la cotización.',
  },
  {
    icon: CalendarDays,
    title: 'Itinerario armado',
    description:
      'Si nos decís cuántos días tenés, ordenamos las excursiones para que entren sin apuro y sin superponer horarios de búsqueda.',
  },
]

export default function GruposPage() {
  const whatsapp = whatsappUrl('Hola, viajamos en grupo a El Calafate y queremos una cotización.')

  return (
    <>
      <PageBanner imageSlug="lago-argentino">
        <Breadcrumbs
          tone="light"
          items={[
            { name: 'Inicio', path: '/' },
            { name: 'Grupos y familias', path: ROUTES.groups },
          ]}
        />
        <SectionHeading
          tone="light"
          as="h1"
          eyebrow="Tres personas o más"
          title="Grupos y familias"
          description="Contanos quiénes viajan y qué quieren hacer. Te armamos el itinerario completo y te pasamos una cotización por el conjunto."
          className="mt-5"
        />
      </PageBanner>

      <div className="container-page py-12 sm:py-16">
        <ul className="grid gap-6 sm:grid-cols-3">
          {POINTS.map((point) => (
            <li key={point.title} className="rounded-card border border-border bg-surface p-6 shadow-subtle">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent" aria-hidden="true">
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
              eyebrow="Pedir cotización"
              title="Contanos de tu grupo"
              description="Cuantos más datos nos des, más precisa es la respuesta: fechas, cantidad de personas, edades de los menores y qué excursiones les interesan."
            />
            <div className="mt-8">
              <ContactForm
                defaultSubject="Cotización para grupo o familia"
                defaultMessage={
                  'Cantidad de personas:\n' +
                  'Edades de los menores (si viajan):\n' +
                  'Fechas en El Calafate:\n' +
                  'Excursiones que nos interesan:\n' +
                  'Hotel o zona de alojamiento:\n'
                }
              />
            </div>
          </div>

          <aside className="mt-10 lg:mt-0">
            <div className="rounded-card border border-border bg-surface-muted p-5">
              <h2 className="font-display text-base font-semibold text-heading">Respuesta directa</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Para grupos preferimos hablar: así ajustamos los horarios de búsqueda por hotel y evitamos que dos
                excursiones se pisen.
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`mailto:${CONTACT.email}`} className="break-all text-primary hover:underline">
                    {CONTACT.email}
                  </a>
                </li>
                {whatsapp ? (
                  <li className="flex items-start gap-2.5">
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Consultar por WhatsApp
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="mt-4 rounded-card border border-border p-5">
              <h2 className="font-sans text-sm font-bold text-heading">¿Sos agencia de viajes?</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Si revendés excursiones, trabajamos con condiciones comerciales propias.
              </p>
              <a
                href={ROUTES.agencies}
                className="mt-3 inline-block text-[0.8125rem] font-semibold text-primary underline underline-offset-2"
              >
                Agencias y operadores
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
