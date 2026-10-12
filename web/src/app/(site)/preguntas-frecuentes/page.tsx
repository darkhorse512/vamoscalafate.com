import Link from 'next/link'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { FaqList } from '@/components/content/FaqList'
import { breadcrumbSchema, faqSchema, jsonLdScript } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { getGlobalFaqs, getTourFaqGroups } from '@/server/queries/content'
import { PageBanner } from '@/components/marketing/PageBanner'

export const metadata: Metadata = buildMetadata({
  title: 'Preguntas frecuentes',
  description:
    'Cómo reservar, medios de pago, entrada al Parque Nacional Los Glaciares, cancelaciones y qué pasa si una excursión se suspende por el clima.',
  path: ROUTES.faq,
})

export default async function FaqPage() {
  const [faqs, groups] = await Promise.all([getGlobalFaqs(), getTourFaqGroups()])

  const crumbs = [
    { name: 'Inicio', path: '/' },
    { name: 'Preguntas frecuentes', path: ROUTES.faq },
  ]

  /*
   * One FAQPage entity for the whole page, general questions first.
   *
   * Google restricts FAQ rich results to a small set of site types, so the
   * snippet is not the reason this markup is here. It is here because the
   * assistants that increasingly answer "¿se puede caminar sobre el Perito
   * Moreno?" read it, and because it states, unambiguously, which answer
   * belongs to which question.
   */
  const schemas = [breadcrumbSchema(crumbs)]
  const faqLd = faqSchema([...faqs, ...groups.flatMap((group) => group.faqs)])
  if (faqLd) schemas.push(faqLd)
  const ld = jsonLdScript(schemas)

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <PageBanner imageSlug="lago-argentino">
          <Breadcrumbs tone="light" items={crumbs} />
          <SectionHeading
            tone="light"
            as="h1"
            eyebrow="Ayuda"
            title="Preguntas frecuentes"
            description="Lo que más nos consultan sobre reservas, pagos, cancelaciones y las excursiones."
            className="mt-5"
          />
      </PageBanner>

      <div className="container-prose py-10 sm:py-12">
        <h2 className="sr-only">Preguntas generales</h2>
        <FaqList faqs={faqs} />

        {groups.length > 0 ? (
          <div className="mt-14">
            <h2 className="font-display text-xl font-semibold text-heading">Preguntas por excursión</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Lo que más nos consultan sobre cada salida: edades, duración, qué llevar y qué incluye.
            </p>

            {/* An index, so the page is navigable instead of a wall of accordions. */}
            <nav aria-label="Excursiones" className="mt-5 flex flex-wrap gap-2">
              {groups.map((group) => (
                <a
                  key={group.id}
                  href={`#faq-${group.slug}`}
                  className="rounded-full border border-border bg-surface-muted px-3.5 py-1.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {group.name}
                </a>
              ))}
            </nav>

            <div className="mt-8 space-y-10">
              {groups.map((group) => (
                <section key={group.id} id={`faq-${group.slug}`} className="scroll-mt-28">
                  <h3 className="font-display text-lg font-semibold text-heading">{group.name}</h3>
                  <FaqList faqs={group.faqs} className="mt-4" />
                  <Link
                    href={ROUTES.tour(group.slug)}
                    className="mt-4 inline-block text-[0.8125rem] font-semibold text-primary underline underline-offset-2"
                  >
                    Ver la excursión
                  </Link>
                </section>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-12 rounded-card border border-border bg-surface-muted p-6 text-center">
          <h2 className="font-display text-lg font-semibold text-heading">
            ¿No encontraste lo que buscabas?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Escribinos y te respondemos. Si es sobre una reserva existente, incluí la referencia.
          </p>
          <Link
            href={ROUTES.contact}
            className="mt-5 inline-flex h-11 items-center rounded-control bg-sky-700 px-5 text-sm font-semibold text-white hover:bg-sky-800"
          >
            Hacer una consulta
          </Link>
        </div>
      </div>
    </>
  )
}
