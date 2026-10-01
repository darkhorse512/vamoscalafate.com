import type { Metadata } from 'next'
import { CheckCircle2 } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SubmissionForm } from '@/components/content/SubmissionForm'
import { buildMetadata } from '@/lib/seo'
import { PageBanner } from '@/components/marketing/PageBanner'

export const metadata: Metadata = buildMetadata({
  title: 'Registrá tu hotel o comercio',
  description:
    'Sumá tu alojamiento, restaurante o servicio a la guía de El Calafate. Enviá la solicitud y nuestro equipo la revisa antes de publicarla.',
  path: ROUTES.hotelRegister,
})

export default function RegistrarPage() {
  return (
    <>
      <PageBanner imageSlug="el-calafate">
          <Breadcrumbs tone="light"
            items={[
              { name: 'Inicio', path: '/' },
              { name: 'Hoteles', path: ROUTES.hotels },
              { name: 'Registrar', path: ROUTES.hotelRegister },
            ]}
          />
          <SectionHeading
            tone="light"
            as="h1"
            eyebrow="Para establecimientos"
            title="Sumá tu establecimiento a la guía"
            description="Publicamos alojamientos, restaurantes y servicios de El Calafate. Completá el formulario y revisamos tu solicitud."
            className="mt-5"
          />
      </PageBanner>

      <div className="container-page py-10 sm:py-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
          <SubmissionForm />

          <aside className="mt-10 lg:mt-0">
            <div className="rounded-card border border-border bg-surface-muted p-5">
              <h2 className="font-display text-base font-semibold text-heading">Cómo funciona</h2>

              <ol className="mt-4 space-y-4">
                {[
                  { title: 'Enviás la solicitud', detail: 'Recibís un correo con la referencia.' },
                  { title: 'Revisamos la información', detail: 'Verificamos los datos del establecimiento.' },
                  { title: 'Te pedimos datos si hace falta', detail: 'Por correo, sobre la misma referencia.' },
                  { title: 'Publicamos la ficha', detail: 'Te avisamos con el enlace a tu página.' },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-700 text-[0.6875rem] font-bold text-white"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[0.8125rem] font-semibold text-heading">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-5 flex gap-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                Las solicitudes no se publican automáticamente. Un responsable revisa cada una.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
