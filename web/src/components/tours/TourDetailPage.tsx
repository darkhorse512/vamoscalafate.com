import Link from 'next/link'
import {
  AlertCircle, ArrowRight, Baby, Backpack, BedDouble, Bus, CalendarCheck, CalendarDays, Check, Clock,
  Footprints, Globe, MapPin, Mountain, RotateCcw, ShieldCheck, Ship, Ticket, UserCheck, Users, Utensils,
  X as XIcon, type LucideIcon,
} from 'lucide-react'
import { ROUTES, formatDuration, formatMoney } from '@vamos/shared'
import type { TourCard as TourCardData, TourDetail } from '@vamos/types'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Breadcrumbs, type Crumb } from '@/components/layout/Breadcrumbs'
import { BookingWidget } from '@/components/booking/BookingWidget'
import { FaqList } from '@/components/content/FaqList'
import { Markdown } from '@/components/content/Markdown'
import { Gallery } from '@/components/media/Gallery'
import { TourCarousel } from './TourCarousel'
import { TourMap } from './TourMap'
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

  const firstOption = tour.options[0]
  const freeCancellationHours = Math.max(0, ...tour.options.map((o) => o.freeCancellationHours ?? 0))

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <div className="container-page pt-6">
        <Breadcrumbs items={crumbs} />
      </div>

      {/* ── Top: gallery beside the summary panel ─────────────────────── */}
      <div className="container-page mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="min-w-0">
          <Gallery images={galleryImages} seed={tour.slug} title={tour.name} tall />
        </div>

        <div className="flex flex-col">
          <p className="rounded-2xl bg-plum-950 px-5 py-3.5 text-[0.875rem] font-medium leading-snug text-white shadow-raised dark:bg-plum-900">
            {tour.summary}
          </p>

          <h1 className="mt-5 font-display text-[2rem] font-bold leading-[1.1] text-heading sm:text-[2.25rem]">
            {tour.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="primary">{tour.category.name}</Badge>
            {tour.featured ? <Badge tone="accent">Destacada</Badge> : null}
            {tour.isDemo ? <Badge tone="warning">Contenido de ejemplo</Badge> : null}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 text-[0.875rem]">
            <Fact icon={<Clock className="size-4" />} label="Duración" value={formatDuration(tour.durationMinutes)} />
            <Fact
              icon={<Mountain className="size-4" />}
              label="Exigencia"
              value={DIFFICULTY_LABEL[tour.difficulty] ?? tour.difficulty}
            />
            {tour.location ? <Fact icon={<MapPin className="size-4" />} label="Lugar" value={tour.location} /> : null}
            {tour.languages.length ? (
              <Fact icon={<Globe className="size-4" />} label="Idiomas" value={tour.languages.join(' · ')} />
            ) : null}
            {tour.maxGroupSize ? (
              <Fact icon={<Users className="size-4" />} label="Grupo" value={`Hasta ${tour.maxGroupSize} personas`} />
            ) : null}
            {tour.minAge ? <Fact icon={<Baby className="size-4" />} label="Edad mínima" value={`${tour.minAge} años`} /> : null}
          </dl>

          {/* Price summary — the full selection happens in the widget below. */}
          <div className="mt-6 rounded-[1.25rem] border border-magenta-500/30 bg-gradient-to-br from-accent-soft/70 via-surface to-primary-soft/60 p-5">
            <p className="text-[0.75rem] font-semibold text-accent">Desde</p>
            <p className="font-display text-[2.25rem] font-bold leading-none text-heading">
              {formatMoney(tour.fromPriceCents ?? firstOption?.priceCents ?? 0, tour.currency)}
            </p>
            <p className="mt-1 text-[0.8125rem] text-accent">por persona</p>
            <ButtonLink href="#reservar" variant="accent" size="lg" fullWidth className="mt-5">
              <CalendarDays className="size-4" aria-hidden="true" />
              Ver fechas y reservar
            </ButtonLink>
            <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
              {freeCancellationHours > 0 ? (
                <TrustLine icon={<RotateCcw className="size-3.5" />}>
                  Cancelación sin cargo hasta {freeCancellationHours} h antes
                </TrustLine>
              ) : null}
              <TrustLine icon={<CalendarCheck className="size-3.5" />}>Disponibilidad real, confirmada al reservar</TrustLine>
              <TrustLine icon={<ShieldCheck className="size-3.5" />}>Pago procesado por plataformas seguras</TrustLine>
            </ul>
          </div>
        </div>
      </div>

      <div className="container-page mt-14 pb-24 lg:pb-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          {/* ── Main column ──────────────────────────────────────────── */}
          <div className="min-w-0 space-y-14">
            {/* Included, as icon tiles */}
            {tour.included.length > 0 ? (
              <section>
                <SectionTitle>
                  <span className="text-accent">Esta experiencia</span> incluye
                </SectionTitle>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {tour.included.map((item) => {
                    const Icon = includedIcon(item)
                    return (
                      <li
                        key={item}
                        className="flex items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3.5 text-[0.875rem] font-medium text-heading ring-1 ring-inset ring-border"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-primary shadow-subtle">
                          <Icon className="size-[1.125rem]" aria-hidden="true" />
                        </span>
                        {item}
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}

            {/* Highlights */}
            {tour.highlights.length > 0 ? (
              <section>
                <SectionTitle>Lo más destacado</SectionTitle>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {tour.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3 text-[0.9375rem] leading-relaxed text-foreground">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-magenta-500 text-white">
                        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Description */}
            <section>
              <SectionTitle>Descripción</SectionTitle>
              <Markdown content={tour.description} className="prose-vamos mt-5" />
            </section>

            {/* Itinerary — numbered timeline on a dashed rail */}
            {tour.itinerary.length > 0 ? (
              <section>
                <SectionTitle>Itinerario</SectionTitle>
                <ol className="mt-7">
                  {tour.itinerary.map((step, index) => (
                    <li key={step.id} className="relative flex gap-5 pb-9 last:pb-0">
                      {index < tour.itinerary.length - 1 ? (
                        <span
                          className="absolute bottom-0 left-[1.4375rem] top-12 border-l-2 border-dashed border-plum-300 dark:border-plum-700"
                          aria-hidden="true"
                        />
                      ) : null}
                      <span
                        className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full bg-plum-950 font-display text-lg font-bold text-white shadow-raised ring-4 ring-surface dark:bg-violet-700"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 pt-2">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h3 className="font-display text-[1.1875rem] font-semibold text-heading">{step.title}</h3>
                          {step.timeLabel ? (
                            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {step.timeLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {/* Route map */}
            {tour.mapEmbedUrl ? (
              <section>
                <SectionTitle>Mapa del recorrido</SectionTitle>
                <div className="mt-6">
                  <TourMap src={tour.mapEmbedUrl} title={`Mapa del recorrido: ${tour.name}`} />
                </div>
              </section>
            ) : null}

            {/* Not included */}
            {tour.excluded.length > 0 ? (
              <section>
                <SectionTitle>No incluye</SectionTitle>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {tour.excluded.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-dashed border-border-strong px-4 py-3 text-[0.875rem] text-muted-foreground"
                    >
                      <XIcon className="size-4 shrink-0 text-subtle-foreground" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Pickup */}
            {tour.pickupLocations.length > 0 ? (
              <section>
                <SectionTitle>Puntos de encuentro</SectionTitle>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {tour.pickupLocations.map((location) => (
                    <li key={location.id} className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-subtle">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                        <MapPin className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[0.9375rem] font-semibold text-heading">{location.name}</p>
                        {location.address ? <p className="mt-0.5 text-xs text-muted-foreground">{location.address}</p> : null}
                        {location.offsetMinutes !== 0 ? (
                          <p className="mt-1.5 text-xs font-medium text-primary">
                            {location.offsetMinutes < 0
                              ? `${Math.abs(location.offsetMinutes)} min antes de la salida`
                              : `${location.offsetMinutes} min después de la salida`}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Important information */}
            {tour.importantInfo ? (
              <section>
                <SectionTitle>Información importante</SectionTitle>
                <div className="mt-6 flex gap-4 rounded-2xl border border-warning/30 bg-warning-soft p-5">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
                  <Markdown content={tour.importantInfo} className="prose-vamos text-[0.9375rem]" />
                </div>
              </section>
            ) : null}

            {/* Cancellation */}
            {tour.cancellationPolicy ? (
              <section>
                <SectionTitle>Política de cancelación</SectionTitle>
                <div className="mt-6 rounded-2xl border border-border bg-surface-muted p-5">
                  <Markdown content={tour.cancellationPolicy} className="prose-vamos text-[0.9375rem]" />
                  <Link
                    href={ROUTES.cancellation}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
                  >
                    Ver la política completa
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </section>
            ) : null}

            {/* Video */}
            {videoEmbed ? (
              <section>
                <SectionTitle>Video</SectionTitle>
                <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-surface-strong shadow-raised">
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
              <section>
                <SectionTitle>Preguntas frecuentes</SectionTitle>
                <FaqList faqs={faqs} className="mt-6" />
              </section>
            ) : null}

            {/* Reviews — only real, approved ones are ever shown. */}
            <section>
              <SectionTitle>Reseñas</SectionTitle>
              {tour.reviews.length > 0 ? (
                <ul className="mt-6 grid gap-4">
                  {tour.reviews.map((review) => (
                    <li key={review.id} className="rounded-2xl border border-border bg-surface p-5 shadow-subtle">
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-3 text-sm font-bold text-heading">
                          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-magenta-500 text-sm text-white">
                            {review.authorName.charAt(0).toUpperCase()}
                          </span>
                          <span>
                            {review.authorName}
                            {review.authorCountry ? (
                              <span className="ml-1.5 font-normal text-muted-foreground">· {review.authorCountry}</span>
                            ) : null}
                          </span>
                        </p>
                        <p className="text-sm text-magenta-500" aria-label={`${review.rating} de 5 estrellas`}>
                          {'★'.repeat(review.rating)}
                          <span className="text-border-strong">{'★'.repeat(5 - review.rating)}</span>
                        </p>
                      </div>
                      {review.title ? <p className="mt-3 text-[0.9375rem] font-semibold text-heading">{review.title}</p> : null}
                      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-foreground">{review.content}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 rounded-2xl border border-dashed border-border-strong bg-surface-muted p-5 text-sm leading-relaxed text-muted-foreground">
                  Esta experiencia todavía no tiene reseñas publicadas. Solo mostramos reseñas de personas que
                  efectivamente realizaron la excursión.
                </p>
              )}
            </section>
          </div>

          {/* ── Booking column ───────────────────────────────────────── */}
          <aside id="reservar" className="mt-14 scroll-mt-28 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
            <BookingWidget tour={tour} />
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 ? (
          <section className="mt-20 border-t border-border pt-14">
            <SectionHeading
              eyebrow="Seguí explorando"
              title="Otras experiencias que te pueden interesar"
              link={{ href: ROUTES.tours, label: 'Ver todas' }}
            />
            <div className="mt-10">
              <TourCarousel tours={related} ariaLabel="Experiencias relacionadas" />
            </div>
          </section>
        ) : null}

        {/* Destination guide — internal linking */}
        {tour.destination ? (
          <section className="relative mt-16 overflow-hidden rounded-[1.5rem] bg-aurora p-8 text-white sm:p-10">
            <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-violet-300">Guía del destino</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-[1.75rem]">
              Antes de ir: {tour.destination.name}
            </h2>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-white/75">
              Leé la guía del destino para entender cómo se llega, qué esperar y cómo combinarlo con el resto de tu viaje.
            </p>
            <ButtonLink href={ROUTES.destination(tour.destination.slug)} variant="glass" className="mt-6">
              Ver la guía de {tour.destination.name}
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </section>
        ) : null}
      </div>
    </>
  )
}

/** Section heading with the brand accent rule. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex flex-col gap-3 font-display text-[1.625rem] font-semibold leading-tight text-heading">
      <span className="accent-rule" aria-hidden="true" />
      <span>{children}</span>
    </h2>
  )
}

function TrustLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-px text-primary" aria-hidden="true">
        {icon}
      </span>
      {children}
    </li>
  )
}

/**
 * Picks an icon for an "included" line from its wording. Purely decorative —
 * the text carries the meaning — so an unmatched item simply gets a check.
 */
function includedIcon(item: string): LucideIcon {
  const text = item.toLocaleLowerCase('es')
  if (/traslad|transporte|bus|vehículo|4x4/.test(text)) return Bus
  if (/guía|guia|coordinador/.test(text)) return UserCheck
  if (/navega|barco|catamar|kayak|lancha/.test(text)) return Ship
  if (/almuerzo|comida|cena|desayuno|refrigerio|snack|bebida|café|cordero|asado/.test(text)) return Utensils
  if (/entrada|ticket|acceso|parque/.test(text)) return Ticket
  if (/crampon|equipo|casco|chaleco|bastones|arnés/.test(text)) return Backpack
  if (/seguro|asistencia/.test(text)) return ShieldCheck
  if (/hotel|alojamiento|noche/.test(text)) return BedDouble
  if (/caballo|cabalgata/.test(text)) return Footprints
  return Check
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-heading">{label}</dt>
        <dd className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">{value}</dd>
      </div>
    </div>
  )
}
