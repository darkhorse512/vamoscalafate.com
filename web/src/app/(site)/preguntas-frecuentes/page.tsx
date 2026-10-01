import Link from 'next/link'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { FaqList } from '@/components/content/FaqList'
import { breadcrumbSchema, faqSchema, jsonLdScript } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { getGlobalFaqs } from '@/server/queries/content'

export const metadata: Metadata = buildMetadata({
  title: 'Preguntas frecuentes',
  description:
    'Cómo reservar, medios de pago, entrada al Parque Nacional Los Glaciares, cancelaciones y qué pasa si una excursión se suspende por el clima.',
  path: ROUTES.faq,
})

export default async function FaqPage() {
  const faqs = await getGlobalFaqs()

  const crumbs = [
    { name: 'Inicio', path: '/' },
    { name: 'Preguntas frecuentes', path: ROUTES.faq },
  ]

  const schemas = [breadcrumbSchema(crumbs)]
  const faqLd = faqSchema(faqs)
  if (faqLd) schemas.push(faqLd)
  const ld = jsonLdScript(schemas)

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <div className="border-b border-border bg-surface-muted">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs items={crumbs} />
          <SectionHeading
            as="h1"
            eyebrow="Ayuda"
            title="Preguntas frecuentes"
            description="Lo que más nos consultan sobre reservas, pagos, cancelaciones y las excursiones."
            className="mt-5"
          />
        </div>
      </div>

      <div className="container-prose py-10 sm:py-12">
        <FaqList faqs={faqs} />

        <div className="mt-12 rounded-card border border-border bg-surface-muted p-6 text-center">
          <h2 className="font-display text-lg font-semibold text-heading">
            ¿No encontraste lo que buscabas?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Escribinos y te respondemos. Si es sobre una reserva existente, incluí la referencia.
          </p>
          <Link
            href={ROUTES.contact}
            className="mt-5 inline-flex h-11 items-center rounded-control bg-violet-700 px-5 text-sm font-semibold text-white hover:bg-violet-800"
          >
            Hacer una consulta
          </Link>
        </div>
      </div>
    </>
  )
}
