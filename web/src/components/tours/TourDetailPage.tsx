import Link from 'next/link'
import {
  AlertCircle, Check, Clock, Globe, MapPin, Mountain, Users, X as XIcon,
} from 'lucide-react'
import { ROUTES, formatDuration } from '@vamos/shared'
import type { TourCard as TourCardData, TourDetail } from '@vamos/types'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs, type Crumb } from '@/components/layout/Breadcrumbs'
import { BookingWidget } from '@/components/booking/BookingWidget'
import { FaqList } from '@/components/content/FaqList'
import { Markdown } from '@/components/content/Markdown'
import { Gallery } from '@/components/media/Gallery'
import { TourGrid } from './TourGrid'
import { breadcrumbSchema, faqSchema, jsonLdScript, tourSchema } from '@/lib/jsonld'
import { toEmbedUrl } from '@/lib/utils'

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Baja exigencia',
  MODERATE: 'Exigencia media',
  CHALLENGING: 'Exigencia alta',
}

/**
 * Tour detail page.
 *
 * Section order follows the decision a traveller actually makes: what it is,
 * what it costs, what happens, what is and is not included, what could go
 * wrong, and only then social proof and alternatives. The booking widget is
 * sticky on desktop and pinned to the bottom bar on mobile, so the action is
 * never more than a glance away.
 */
export function TourDetailPage({
  tour,
  related,
  crumbs,
  path,
}: {
  tour: TourDetail
  related: TourCardData[]
  crumbs: Crumb[]
  path: string
}) {
  const schemas = [tourSchema(tour, path), breadcrumbSchema(crumbs)]
  const faqs = tour.faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))
  const faqLd = faqSchema(faqs)
  if (faqLd) schemas.push(faqLd)

  const ld = jsonLdScript(schemas)
  const galleryImages = tour.images.map((i) => i.media)
  const video = tour.videos[0]?.media
  const videoEmbed = video?.externalUrl ? toEmbedUrl(video.externalUrl) : null

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      {/* ── Breadcrumb + hero gallery ─────────────────────────────────── */}
      <div className="container-page pt-6">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="container-page mt-5">
        <Gallery images={galleryImages} seed={tour.slug} title={tour.name} />
      </div>

      <div className="container-page mt-8 pb-24 lg:pb-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          {/* ── Main column ──────────────────────────────────────────── */}
          <div className="min-w-0">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="glacier">{tour.category.name}</Badge>
                {tour.featured ? <Badge tone="ochre">Destacada</Badge> : null}
                {tour.isDemo ? <Badge tone="warning">Contenido de ejemplo</Badge> : null}
              </div>

              <h1 className="mt-3 font-display text-display-sm font-bold leading-[1.1] text-lenga-950">
                {tour.name}
              </h1>

              <p className="mt-4 text-[1.0625rem] leading-relaxed text-lenga-700">{tour.summary}</p>

              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-y border-stone-200 py-4 text-sm text-lenga-600">
                <Fact icon={<Clock className="size-4" />} label={formatDuration(tour.durationMinutes)} />
                {tour.location ? (
                  <Fact icon={<MapPin className="size-4" />} label={tour.location} />
                ) : null}
                <Fact
                  icon={<Mountain className="size-4" />}
                  label={DIFFICULTY_LABEL[tour.difficulty] ?? tour.difficulty}
                />
                {tour.maxGroupSize ? (
                  <Fact icon={<Users className="size-4" />} label={`Hasta ${tour.maxGroupSize} personas`} />
                ) : null}
                {tour.languages.length ? (
                  <Fact icon={<Globe className="size-4" />} label={tour.languages.join(' · ')} />
                ) : null}
              </ul>
            </header>

            {/* Highlights */}
            {tour.highlights.length > 0 ? (
              <section className="mt-9">
                <h2 className="font-display text-xl font-semibold text-lenga-950">
                  Lo más destacado
                </h2>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {tour.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2.5 text-[0.9375rem] text-lenga-700">
                      <Check className="mt-0.5 size-4 shrink-0 text-glacier-600" aria-hidden="true" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Description */}
            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold text-lenga-950">Descripción</h2>
              <Markdown content={tour.description} className="prose-vamos mt-4" />
            </section>

            {/* Itinerary */}
            {tour.itinerary.length > 0 ? (
              <section className="mt-12">
                <h2 className="font-display text-xl font-semibold text-lenga-950">Itinerario</h2>

                <ol className="mt-5 space-y-0">
                  {tour.itinerary.map((step, index) => (
                    <li key={step.id} className="relative flex gap-4 pb-7 last:pb-0">
                      {/* Connector line, hidden on the last step */}
                      {index < tour.itinerary.length - 1 ? (
                        <span
                          className="absolute left-[0.9375rem] top-8 h-[calc(100%-1.5rem)] w-px bg-stone-200"
                          aria-hidden="true"
                        />
                      ) : null}

                      <span
                        className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-glacier-700 text-xs font-bold text-white"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-3">
                          <h3 className="font-sans text-[0.9375rem] font-bold text-lenga-950">
                            {step.title}
                          </h3>
                          {step.timeLabel ? (
                            <span className="text-xs font-medium text-glacier-700">
                              {step.timeLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-lenga-600">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {/* Included / excluded */}
            {tour.included.length > 0 || tour.excluded.length > 0 ? (
              <section className="mt-12 grid gap-8 sm:grid-cols-2">
                {tour.included.length > 0 ? (
                  <div>
                    <h2 className="font-display text-xl font-semibold text-lenga-950">Incluye</h2>
                    <ul className="mt-4 space-y-2.5">
                      {tour.included.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-[0.9375rem] text-lenga-700">
                          <Check className="mt-0.5 size-4 shrink-0 text-[#2f6f4f]" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {tour.excluded.length > 0 ? (
                  <div>
                    <h2 className="font-display text-xl font-semibold text-lenga-950">No incluye</h2>
                    <ul className="mt-4 space-y-2.5">
                      {tour.excluded.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-[0.9375rem] text-lenga-600">
                          <XIcon className="mt-0.5 size-4 shrink-0 text-stone-400" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Pickup */}
            {tour.pickupLocations.length > 0 ? (
              <section className="mt-12">
                <h2 className="font-display text-xl font-semibold text-lenga-950">
                  Puntos de encuentro
                </h2>
                <ul className="mt-4 divide-y divide-stone-200 rounded-card border border-stone-200">
                  {tour.pickupLocations.map((location) => (
                    <li key={location.id} className="flex items-start justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] font-medium text-lenga-900">{location.name}</p>
                        {location.address ? (
                          <p className="mt-0.5 text-xs text-lenga-500">{location.address}</p>
                        ) : null}
                      </div>
                      {location.offsetMinutes !== 0 ? (
                        <span className="shrink-0 text-xs text-lenga-500">
                          {location.offsetMinutes < 0
                            ? `${Math.abs(location.offsetMinutes)} min antes`
                            : `${location.offsetMinutes} min después`}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Important information */}
            {tour.importantInfo ? (
              <section className="mt-12">
                <h2 className="font-display text-xl font-semibold text-lenga-950">
                  Información importante
                </h2>
                <div className="mt-4 rounded-card border-l-[3px] border-[#c9942a] bg-[#fdf9f0] p-5">
                  <AlertCircle className="mb-2.5 size-5 text-[#8a6014]" aria-hidden="true" />
                  <Markdown content={tour.importantInfo} className="prose-vamos text-[0.9375rem]" />
                </div>
              </section>
            ) : null}

            {/* Cancellation */}
            {tour.cancellationPolicy ? (
              <section className="mt-12">
                <h2 className="font-display text-xl font-semibold text-lenga-950">
                  Política de cancelación
                </h2>
                <Markdown
                  content={tour.cancellationPolicy}
                  className="prose-vamos mt-4 text-[0.9375rem]"
                />
                <p className="mt-4 text-sm">
                  <Link
                    href={ROUTES.cancellation}
                    className="font-medium text-glacier-700 underline underline-offset-2 hover:text-glacier-900"
                  >
                    Ver la política completa
                  </Link>
                </p>
              </section>
            ) : null}

            {/* Video */}
            {videoEmbed ? (
              <section className="mt-12">
                <h2 className="font-display text-xl font-semibold text-lenga-950">Video</h2>
                <div className="mt-4 aspect-video overflow-hidden rounded-card bg-stone-100">
                  <iframe
                    src={videoEmbed}
                    title={`Video: ${tour.name}`}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="size-full border-0"
                  />
                </div>
              </section>
            ) : null}

            {/* FAQ */}
            {faqs.length > 0 ? (
              <section className="mt-12">
                <h2 className="font-display text-xl font-semibold text-lenga-950">
                  Preguntas frecuentes
                </h2>
                <FaqList faqs={faqs} className="mt-4" />
              </section>
            ) : null}

            {/* Reviews — only real, approved ones are ever shown. */}
            <section className="mt-12">
              <h2 className="font-display text-xl font-semibold text-lenga-950">Reseñas</h2>
              {tour.reviews.length > 0 ? (
                <ul className="mt-5 space-y-5">
                  {tour.reviews.map((review) => (
                    <li
                      key={review.id}
                      className="rounded-card border border-stone-200 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-sans text-sm font-bold text-lenga-950">
                          {review.authorName}
                          {review.authorCountry ? (
                            <span className="ml-1.5 font-normal text-lenga-500">
                              · {review.authorCountry}
                            </span>
                          ) : null}
                        </p>
                        <p
                          className="text-sm text-ochre-500"
                          aria-label={`${review.rating} de 5 estrellas`}
                        >
                          {'★'.repeat(review.rating)}
                          <span className="text-stone-300">{'★'.repeat(5 - review.rating)}</span>
                        </p>
                      </div>

                      {review.title ? (
                        <p className="mt-2 text-[0.9375rem] font-semibold text-lenga-900">
                          {review.title}
                        </p>
                      ) : null}

                      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-lenga-700">
                        {review.content}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-card border border-dashed border-stone-300 bg-stone-50 p-5 text-sm leading-relaxed text-lenga-600">
                  Esta experiencia todavía no tiene reseñas publicadas. Solo mostramos reseñas de
                  personas que efectivamente realizaron la excursión.
                </p>
              )}
            </section>
          </div>

          {/* ── Booking column ───────────────────────────────────────── */}
          <aside id="reservar" className="mt-10 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
            <BookingWidget tour={tour} />
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 ? (
          <section className="mt-16 border-t border-stone-200 pt-12">
            <h2 className="font-display text-xl font-semibold text-lenga-950">
              Otras experiencias que te pueden interesar
            </h2>
            <TourGrid tours={related} columns={3} className="mt-6" />
          </section>
        ) : null}

        {/* Related destination guide — internal linking */}
        {tour.destination ? (
          <section className="mt-12 rounded-card border border-stone-200 bg-stone-50 p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-lenga-950">
              Antes de ir: {tour.destination.name}
            </h2>
            <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-lenga-600">
              Leé la guía del destino para entender cómo se llega, qué esperar y cómo combinarlo con
              el resto de tu viaje.
            </p>
            <Link
              href={ROUTES.destination(tour.destination.slug)}
              className="mt-4 inline-block text-sm font-semibold text-glacier-700 underline underline-offset-2 hover:text-glacier-900"
            >
              Ver la guía de {tour.destination.name}
            </Link>
          </section>
        ) : null}
      </div>
    </>
  )
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="inline-flex items-center gap-2">
      <span className="text-glacier-600" aria-hidden="true">
        {icon}
      </span>
      {label}
    </li>
  )
}
