import type { Metadata } from 'next'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { CONTACT, LOCATION, ROUTES, whatsappUrl } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ContactForm } from '@/components/content/ContactForm'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  title: 'Contacto',
  description:
    'Consultanos sobre excursiones, traslados y experiencias en El Calafate. Respondemos por correo y WhatsApp.',
  path: ROUTES.contact,
})

export default async function ContactoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const tourSlug = typeof params.tour === 'string' ? params.tour : undefined
  const whatsapp = whatsappUrl('Hola, quiero hacer una consulta sobre una excursión.')

  return (
    <>
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Contacto', path: ROUTES.contact }]} />
          <SectionHeading
            as="h1"
            eyebrow="Escribinos"
            title="¿Tenés una consulta?"
            description="Respondemos dudas sobre excursiones, disponibilidad, traslados y armado de itinerarios."
            className="mt-5"
          />
        </div>
      </div>

      <div className="container-page py-10 sm:py-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
          <ContactForm tourSlug={tourSlug} />

          <aside className="mt-10 lg:mt-0">
            <div className="rounded-card border border-stone-200 bg-stone-50 p-5">
              <h2 className="font-display text-base font-semibold text-lenga-950">
                Otras formas de contacto
              </h2>

              <ul className="mt-4 space-y-3.5 text-sm">
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-glacier-600" aria-hidden="true" />
                  <a href={`mailto:${CONTACT.email}`} className="break-all text-glacier-700 hover:underline">
                    {CONTACT.email}
                  </a>
                </li>

                {CONTACT.phone ? (
                  <li className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-glacier-600" aria-hidden="true" />
                    <a href={`tel:${CONTACT.phone}`} className="text-glacier-700 hover:underline">
                      {CONTACT.phone}
                    </a>
                  </li>
                ) : null}

                {whatsapp ? (
                  <li className="flex items-start gap-2.5">
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-glacier-600" aria-hidden="true" />
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-glacier-700 hover:underline"
                    >
                      Consultar por WhatsApp
                    </a>
                  </li>
                ) : null}

                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-glacier-600" aria-hidden="true" />
                  <span className="text-lenga-700">
                    {LOCATION.city}, {LOCATION.province}, {LOCATION.country}
                  </span>
                </li>
              </ul>

              <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-relaxed text-lenga-500">
                Si tu consulta es sobre una reserva existente, incluí la referencia (por ejemplo
                VC-XXXXXX) para que podamos ayudarte más rápido.
              </p>
            </div>

            <div className="mt-4 rounded-card border border-stone-200 p-5">
              <h2 className="font-sans text-sm font-bold text-lenga-950">
                ¿Buscás respuestas rápidas?
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-lenga-600">
                Muchas dudas frecuentes ya están respondidas.
              </p>
              <a
                href={ROUTES.faq}
                className="mt-3 inline-block text-[0.8125rem] font-semibold text-glacier-700 underline underline-offset-2"
              >
                Ver preguntas frecuentes
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
