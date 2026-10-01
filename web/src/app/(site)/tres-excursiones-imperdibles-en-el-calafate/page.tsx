import type { Metadata } from 'next'
import { ArrowRight, Gift } from 'lucide-react'
import { ROUTES, absoluteUrl } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageBanner } from '@/components/marketing/PageBanner'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ButtonLink } from '@/components/ui/Button'
import { SmartImage } from '@/components/media/SmartImage'
import { ContactForm } from '@/components/content/ContactForm'
import { Price } from '@/components/tours/Price'
import { getHomeConfig, getMustSeeTours } from '@/server/queries/home'

export const metadata: Metadata = {
  title: 'Tres excursiones imperdibles en El Calafate',
  description:
    'El Glaciar Perito Moreno, la Navegación Todo Glaciares y El Chaltén: las tres excursiones que no te podés perder. Bonificaciones contratando las tres.',
  alternates: { canonical: absoluteUrl(ROUTES.mustSee) },
}

/** The article text from the brief, one block per excursion, in order. */
const SECTIONS = [
  {
    eyebrow: 'Un encuentro con la grandeza natural',
    title: 'Glaciar Perito Moreno',
    text: 'El Glaciar Perito Moreno es uno de los tesoros más preciados de la Patagonia. Esta masa de hielo majestuosa y en constante movimiento te dejará sin aliento. Podrás caminar por las pasarelas frente al glaciar, admirando su imponente presencia y escuchando el retumbar de los desprendimientos de hielo, rodeado de un paisaje de montañas y bosques que completan la experiencia. No olvides tu cámara para capturar momentos inolvidables.',
  },
  {
    eyebrow: 'Un viaje por un mundo de hielo',
    title: 'Navegación Todo Glaciares',
    text: 'La Navegación Todo Glaciares te lleva por los paisajes más impresionantes de la región. A bordo de un catamarán navegarás hasta los glaciares Spegazzini y Upsala, entre otros. Quedarás maravillado por la inmensidad de estas masas de hielo, sus formas caprichosas y sus tonos azules profundos, y podrás acercarte a las paredes de hielo para escuchar el desprendimiento de los témpanos.',
  },
  {
    eyebrow: 'La Capital Nacional del Trekking',
    title: 'El Chaltén',
    text: 'Si te gustan el senderismo y la aventura, El Chaltén es un lugar que no podés dejar de visitar. Este pintoresco pueblo es la puerta de entrada al Parque Nacional Los Glaciares: senderos hacia miradores increíbles, lagos de color turquesa y montañas imponentes, incluido el famoso Cerro Fitz Roy.',
  },
]

export default async function MustSeePage() {
  const config = await getHomeConfig()
  const tours = await getMustSeeTours(config.sections.catalogue.banner.tourSlugs)

  return (
    <>
      <PageBanner imageSlug="glaciar-perito-moreno">
        <Breadcrumbs
          tone="light"
          items={[
            { name: 'Inicio', path: '/' },
            { name: '3 excursiones imperdibles', path: ROUTES.mustSee },
          ]}
        />
        <SectionHeading
          tone="light"
          as="h1"
          eyebrow="Descubrí la magia de la Patagonia"
          title="Tres excursiones imperdibles en El Calafate"
          description="El Calafate es un destino de ensueño para los amantes de la naturaleza y la aventura. Estas son las tres excursiones que no podés dejar de hacer durante tu visita."
          className="mt-5"
        />
      </PageBanner>

      <div className="container-page py-16 sm:py-20">
        <ol className="space-y-20 sm:space-y-28">
          {SECTIONS.map((section, index) => {
            const tour = tours[index]
            const reversed = index % 2 === 1
            return (
              <li key={section.title} className="reveal grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className={reversed ? 'lg:order-2' : ''}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] shadow-float">
                    <SmartImage
                      media={tour?.images[0]?.media}
                      seed={`imperdible-${index}`}
                      alt={section.title}
                      sizes="(max-width: 1023px) 100vw, 50vw"
                      priority={index === 0}
                    />
                    <span className="absolute left-5 top-5 grid size-14 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-magenta-500 font-display text-2xl font-bold text-white shadow-accent">
                      {index + 1}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="inline-flex items-center gap-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-primary">
                    <span className="accent-rule" aria-hidden="true" />
                    {section.eyebrow}
                  </p>
                  <h2 className="mt-3 font-display text-[2rem] font-bold leading-tight text-heading sm:text-[2.5rem]">
                    {section.title}
                  </h2>
                  <p className="mt-5 text-[1.0625rem] leading-relaxed text-foreground">{section.text}</p>

                  {tour ? (
                    <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-border pt-6">
                      <Price cents={tour.fromPriceCents} currency={tour.currency} from size="md" />
                      <ButtonLink href={ROUTES.tour(tour.slug)} variant="primary">
                        Ver la excursión
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </ButtonLink>
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* ── The bundle offer ─────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-aurora py-16 text-white sm:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div className="reveal">
            <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-magenta-500 shadow-accent">
              <Gift className="size-7" aria-hidden="true" />
            </span>
            <h2 className="mt-6 font-display text-[2rem] font-bold leading-tight text-white sm:text-[2.75rem]">
              Importantes bonificaciones contratando <span className="text-gradient">3 excursiones</span>
            </h2>
            <p className="mt-5 max-w-lg text-[1.0625rem] leading-relaxed text-white/80">
              El Calafate te espera con sus tres excursiones imperdibles. Cada una te ofrece una experiencia
              única en medio de la magnificencia natural de la Patagonia. Escribinos y te enviamos la
              promoción para las tres.
            </p>
            <ul className="mt-8 space-y-3 text-[0.9375rem] text-white/85">
              {SECTIONS.map((section, index) => (
                <li key={section.title} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-white/15 text-xs font-bold ring-1 ring-white/25">
                    {index + 1}
                  </span>
                  {section.title}
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal rounded-[1.5rem] bg-surface p-6 text-foreground shadow-float sm:p-8">
            <h3 className="font-display text-xl font-semibold text-heading">Pedí la promoción</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">Te respondemos por email o WhatsApp.</p>
            <div className="mt-6">
              <ContactForm
                defaultSubject="Promoción 3 excursiones imperdibles"
                defaultMessage="Hola, quiero recibir la promoción por las 3 excursiones imperdibles (Glaciar Perito Moreno, Navegación Todo Glaciares y El Chaltén). Viajamos ___ personas, del __/__ al __/__."
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
