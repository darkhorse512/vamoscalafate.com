'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ChevronDown, Loader2, Plus, Trash2 } from 'lucide-react'
import { slugify } from '@vamos/shared'
import { Alert, Button } from '@/components/ui/primitives'
import { GalleryField } from './ImageField'
import { createTourAction, updateTourAction } from '@/server/actions/tours'
import type { TourFormData } from '@/lib/tour-form-data'
import { cn } from '@/lib/utils'

/**
 * Tour editor.
 *
 * Organised into collapsible sections rather than a single long form or a
 * wizard: an editor fixing one price should not have to walk through six
 * steps, and a 40-field flat form is unnavigable.
 *
 * All validation is advisory here. The server re-parses the whole payload
 * with the same Zod schema, so nothing the browser sends is trusted.
 */

const linesToArray = (value: string) =>
  value.split('\n').map((line) => line.trim()).filter(Boolean)

export function TourForm({
  initial,
  categories,
  destinations,
}: {
  initial: TourFormData
  categories: { id: string; name: string; channel: string }[]
  destinations: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<TourFormData>(initial)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function update<K extends keyof TourFormData>(key: K, value: TourFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      summary: form.summary,
      description: form.description,
      status: form.status,
      categoryId: form.categoryId,
      destinationId: form.destinationId || null,
      durationMinutes: Number(form.durationMinutes),
      difficulty: form.difficulty,
      location: form.location,
      minAge: form.minAge ? Number(form.minAge) : null,
      maxGroupSize: form.maxGroupSize ? Number(form.maxGroupSize) : null,
      languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean),
      highlights: linesToArray(form.highlights),
      included: linesToArray(form.included),
      excluded: linesToArray(form.excluded),
      importantInfo: form.importantInfo,
      cancellationPolicy: form.cancellationPolicy,
      featured: form.featured,
      sortOrder: Number(form.sortOrder),

      options: form.options.map((option, index) => ({
        ...(option.id ? { id: option.id } : {}),
        name: option.name,
        description: option.description,
        price: Number(option.price),
        ...(option.childPrice !== '' ? { childPrice: Number(option.childPrice) } : {}),
        currency: option.currency,
        durationMinutes: Number(option.durationMinutes),
        capacity: Number(option.capacity),
        minParticipants: Number(option.minParticipants),
        maxParticipants: Number(option.maxParticipants),
        pickupIncluded: option.pickupIncluded,
        departureTimes: option.departureTimes.split(',').map((s) => s.trim()).filter(Boolean),
        freeCancellationHours: Number(option.freeCancellationHours),
        isActive: option.isActive,
        sortOrder: index,
      })),

      itinerary: form.itinerary.map((step, index) => ({
        ...(step.id ? { id: step.id } : {}),
        title: step.title,
        description: step.description,
        timeLabel: step.timeLabel,
        sortOrder: index,
      })),

      pickupLocations: form.pickupLocations.map((location, index) => ({
        ...(location.id ? { id: location.id } : {}),
        name: location.name,
        address: location.address,
        offsetMinutes: Number(location.offsetMinutes),
        extraCost: Number(location.extraCost),
        isActive: location.isActive,
        sortOrder: index,
      })),

      faqs: form.faqs.map((faq, index) => ({
        ...(faq.id ? { id: faq.id } : {}),
        question: faq.question,
        answer: faq.answer,
        isPublished: faq.isPublished,
        sortOrder: index,
      })),

      imageIds: form.imageIds,
      coverImageId: form.coverImageId || form.imageIds[0] || null,
      videoIds: [],
      relatedTourIds: [],
      seo: form.seo,
    }

    startTransition(async () => {
      const result = form.id
        ? await updateTourAction(form.id, payload)
        : await createTourAction(payload)

      if (!result.ok) {
        setError(result.message)
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      router.push('/tours')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5 pb-20">
      {error ? <Alert tone="danger" title="No se pudo guardar">{error}</Alert> : null}

      {/* Warn loudly before an editor accidentally de-indexes a live page. */}
      {form.seo.noindex && form.status === 'PUBLISHED' ? (
        <Alert tone="warning" title="Esta página no se indexará">
          La excursión está publicada pero tiene «noindex» activado, así que no aparecerá en
          Google. Desactivalo salvo que sea intencional.
        </Alert>
      ) : null}

      <Section title="Información general" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required error={fieldErrors.name?.[0]}>
            <input
              value={form.name}
              onChange={(event) => {
                update('name', event.target.value)
                // Auto-slug only while creating; changing a live slug breaks
                // inbound links, so it stays manual after the first save.
                if (!form.id) update('slug', slugify(event.target.value))
              }}
              required
              className="admin-input"
            />
          </Field>

          <Field label="Slug (URL)" required error={fieldErrors.slug?.[0]} hint="Solo minúsculas, números y guiones.">
            <input
              value={form.slug}
              onChange={(event) => update('slug', event.target.value)}
              required
              className="admin-input font-mono text-[0.8125rem]"
            />
          </Field>
        </div>

        <Field label="Resumen" required error={fieldErrors.summary?.[0]} hint="Una línea. Aparece en las tarjetas y en los resultados de búsqueda.">
          <textarea
            value={form.summary}
            onChange={(event) => update('summary', event.target.value)}
            rows={2}
            maxLength={300}
            required
            className="admin-input"
          />
        </Field>

        <Field label="Descripción" required error={fieldErrors.description?.[0]} hint="Admite Markdown: ## títulos, **negrita**, listas con -.">
          <textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            rows={10}
            required
            className="admin-input font-mono text-[0.8125rem]"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Categoría" required error={fieldErrors.categoryId?.[0]}>
            <select
              value={form.categoryId}
              onChange={(event) => update('categoryId', event.target.value)}
              required
              className="admin-input"
            >
              <option value="">Elegir…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.channel})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Destino">
            <select
              value={form.destinationId}
              onChange={(event) => update('destinationId', event.target.value)}
              className="admin-input"
            >
              <option value="">Sin destino</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Estado">
            <select
              value={form.status}
              onChange={(event) => update('status', event.target.value)}
              className="admin-input"
            >
              <option value="DRAFT">Borrador</option>
              <option value="IN_REVIEW">En revisión</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Duración (minutos)" required>
            <input
              type="number"
              min={15}
              value={form.durationMinutes}
              onChange={(event) => update('durationMinutes', Number(event.target.value))}
              required
              className="admin-input"
            />
          </Field>

          <Field label="Exigencia">
            <select
              value={form.difficulty}
              onChange={(event) => update('difficulty', event.target.value)}
              className="admin-input"
            >
              <option value="EASY">Baja</option>
              <option value="MODERATE">Media</option>
              <option value="CHALLENGING">Alta</option>
            </select>
          </Field>

          <Field label="Edad mínima">
            <input
              type="number"
              min={0}
              value={form.minAge}
              onChange={(event) => update('minAge', event.target.value)}
              className="admin-input"
            />
          </Field>

          <Field label="Grupo máximo">
            <input
              type="number"
              min={1}
              value={form.maxGroupSize}
              onChange={(event) => update('maxGroupSize', event.target.value)}
              className="admin-input"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ubicación" hint="Ej: Parque Nacional Los Glaciares">
            <input
              value={form.location}
              onChange={(event) => update('location', event.target.value)}
              className="admin-input"
            />
          </Field>

          <Field label="Idiomas" hint="Separados por comas">
            <input
              value={form.languages}
              onChange={(event) => update('languages', event.target.value)}
              className="admin-input"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6">
          <Checkbox
            label="Destacada en la portada"
            checked={form.featured}
            onChange={(checked) => update('featured', checked)}
          />
          <Field label="Orden" hint="Menor primero">
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => update('sortOrder', Number(event.target.value))}
              className="admin-input w-24"
            />
          </Field>
        </div>
      </Section>

      {/* ── Options: the pricing model ─────────────────────────────── */}
      <Section title={`Opciones y precios (${form.options.length})`} defaultOpen>
        <p className="mb-3 text-[0.8125rem] text-slate-500">
          El precio vive en las opciones, no en la excursión. Cada opción puede tener su propio
          precio, capacidad, horarios y política de cancelación.
        </p>

        {fieldErrors.options ? (
          <div className="mb-3">
            <Alert tone="danger">{fieldErrors.options[0]}</Alert>
          </div>
        ) : null}

        <div className="space-y-3">
          {form.options.map((option, index) => (
            <div key={index} className="rounded-control border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[0.8125rem] font-semibold text-slate-900">
                  Opción {index + 1}
                  {option.id ? null : (
                    <span className="ml-2 text-[0.6875rem] font-normal text-slate-500">nueva</span>
                  )}
                </h3>
                {form.options.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      update('options', form.options.filter((_, i) => i !== index))
                    }
                    className="inline-flex items-center gap-1 text-[0.75rem] text-status-danger hover:underline"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Quitar
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" required>
                  <input
                    value={option.name}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, name: event.target.value }
                      update('options', next)
                    }}
                    required
                    className="admin-input"
                  />
                </Field>

                <Field label="Descripción">
                  <input
                    value={option.description}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, description: event.target.value }
                      update('options', next)
                    }}
                    className="admin-input"
                  />
                </Field>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <Field label="Precio adulto" required hint="En pesos, no en centavos">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={option.price}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, price: Number(event.target.value) }
                      update('options', next)
                    }}
                    required
                    className="admin-input"
                  />
                </Field>

                <Field label="Precio menor" hint="Vacío = misma tarifa">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={option.childPrice}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, childPrice: event.target.value }
                      update('options', next)
                    }}
                    className="admin-input"
                  />
                </Field>

                <Field label="Duración (min)">
                  <input
                    type="number"
                    min={15}
                    value={option.durationMinutes}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, durationMinutes: Number(event.target.value) }
                      update('options', next)
                    }}
                    className="admin-input"
                  />
                </Field>

                <Field label="Capacidad">
                  <input
                    type="number"
                    min={1}
                    value={option.capacity}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, capacity: Number(event.target.value) }
                      update('options', next)
                    }}
                    className="admin-input"
                  />
                </Field>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <Field label="Mín. participantes">
                  <input
                    type="number"
                    min={1}
                    value={option.minParticipants}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, minParticipants: Number(event.target.value) }
                      update('options', next)
                    }}
                    className="admin-input"
                  />
                </Field>

                <Field label="Máx. participantes">
                  <input
                    type="number"
                    min={1}
                    value={option.maxParticipants}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, maxParticipants: Number(event.target.value) }
                      update('options', next)
                    }}
                    className="admin-input"
                  />
                </Field>

                <Field label="Horarios" hint="HH:MM separados por comas">
                  <input
                    value={option.departureTimes}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, departureTimes: event.target.value }
                      update('options', next)
                    }}
                    placeholder="08:00, 14:00"
                    className="admin-input"
                  />
                </Field>

                <Field label="Cancelación (h)" hint="0 = sin cancelación gratuita">
                  <input
                    type="number"
                    min={0}
                    value={option.freeCancellationHours}
                    onChange={(event) => {
                      const next = [...form.options]
                      next[index] = { ...option, freeCancellationHours: Number(event.target.value) }
                      update('options', next)
                    }}
                    className="admin-input"
                  />
                </Field>
              </div>

              <div className="mt-3 flex flex-wrap gap-5">
                <Checkbox
                  label="Incluye traslado"
                  checked={option.pickupIncluded}
                  onChange={(checked) => {
                    const next = [...form.options]
                    next[index] = { ...option, pickupIncluded: checked }
                    update('options', next)
                  }}
                />
                <Checkbox
                  label="Activa"
                  checked={option.isActive}
                  onChange={(checked) => {
                    const next = [...form.options]
                    next[index] = { ...option, isActive: checked }
                    update('options', next)
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() =>
            update('options', [
              ...form.options,
              {
                name: '', description: '', price: 0, childPrice: '', currency: 'ARS',
                durationMinutes: form.durationMinutes, capacity: 20, minParticipants: 1,
                maxParticipants: 20, pickupIncluded: false, departureTimes: '',
                freeCancellationHours: 24, isActive: true,
              },
            ])
          }
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar opción
        </Button>
      </Section>

      <Section title={`Galería (${form.imageIds.length})`} defaultOpen>
        <GalleryField
          label="Imágenes de la excursión"
          hint="La portada es la que aparece en las tarjetas y al compartir el enlace. Arrastrá archivos directamente en el selector para subirlos."
          value={form.imageIds}
          coverId={form.coverImageId}
          onChange={(ids) => update('imageIds', ids)}
          onCoverChange={(id) => update('coverImageId', id)}
        />
      </Section>

      <Section title="Qué incluye y qué no">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Incluye" hint="Un ítem por línea">
            <textarea
              value={form.included}
              onChange={(event) => update('included', event.target.value)}
              rows={6}
              className="admin-input"
            />
          </Field>

          <Field label="No incluye" hint="Un ítem por línea">
            <textarea
              value={form.excluded}
              onChange={(event) => update('excluded', event.target.value)}
              rows={6}
              className="admin-input"
            />
          </Field>
        </div>

        <Field label="Lo más destacado" hint="Un ítem por línea. Máximo 12.">
          <textarea
            value={form.highlights}
            onChange={(event) => update('highlights', event.target.value)}
            rows={5}
            className="admin-input"
          />
        </Field>
      </Section>

      <Section title={`Itinerario (${form.itinerary.length})`}>
        <div className="space-y-3">
          {form.itinerary.map((step, index) => (
            <div key={index} className="rounded-control border border-slate-200 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.75rem] font-semibold text-slate-600">Paso {index + 1}</span>
                <button
                  type="button"
                  onClick={() => update('itinerary', form.itinerary.filter((_, i) => i !== index))}
                  className="text-[0.75rem] text-status-danger hover:underline"
                >
                  Quitar
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <input
                  value={step.title}
                  onChange={(event) => {
                    const next = [...form.itinerary]
                    next[index] = { ...step, title: event.target.value }
                    update('itinerary', next)
                  }}
                  placeholder="Título del paso"
                  aria-label={`Título del paso ${index + 1}`}
                  className="admin-input"
                />
                <input
                  value={step.timeLabel}
                  onChange={(event) => {
                    const next = [...form.itinerary]
                    next[index] = { ...step, timeLabel: event.target.value }
                    update('itinerary', next)
                  }}
                  placeholder="08:30"
                  aria-label={`Horario del paso ${index + 1}`}
                  className="admin-input"
                />
              </div>

              <textarea
                value={step.description}
                onChange={(event) => {
                  const next = [...form.itinerary]
                  next[index] = { ...step, description: event.target.value }
                  update('itinerary', next)
                }}
                rows={2}
                placeholder="Qué ocurre en este paso"
                aria-label={`Descripción del paso ${index + 1}`}
                className="admin-input mt-3"
              />
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() =>
            update('itinerary', [...form.itinerary, { title: '', description: '', timeLabel: '' }])
          }
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar paso
        </Button>
      </Section>

      <Section title={`Puntos de encuentro (${form.pickupLocations.length})`}>
        <div className="space-y-3">
          {form.pickupLocations.map((location, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-control border border-slate-200 p-3.5 sm:grid-cols-[2fr_2fr_1fr_1fr_auto]"
            >
              <input
                value={location.name}
                onChange={(event) => {
                  const next = [...form.pickupLocations]
                  next[index] = { ...location, name: event.target.value }
                  update('pickupLocations', next)
                }}
                placeholder="Nombre"
                aria-label={`Nombre del punto ${index + 1}`}
                className="admin-input"
              />
              <input
                value={location.address}
                onChange={(event) => {
                  const next = [...form.pickupLocations]
                  next[index] = { ...location, address: event.target.value }
                  update('pickupLocations', next)
                }}
                placeholder="Dirección"
                aria-label={`Dirección del punto ${index + 1}`}
                className="admin-input"
              />
              <input
                type="number"
                value={location.offsetMinutes}
                onChange={(event) => {
                  const next = [...form.pickupLocations]
                  next[index] = { ...location, offsetMinutes: Number(event.target.value) }
                  update('pickupLocations', next)
                }}
                placeholder="Offset"
                aria-label={`Offset en minutos del punto ${index + 1}`}
                className="admin-input"
              />
              <input
                type="number"
                step="0.01"
                value={location.extraCost}
                onChange={(event) => {
                  const next = [...form.pickupLocations]
                  next[index] = { ...location, extraCost: Number(event.target.value) }
                  update('pickupLocations', next)
                }}
                placeholder="Extra"
                aria-label={`Costo extra del punto ${index + 1}`}
                className="admin-input"
              />
              <button
                type="button"
                onClick={() =>
                  update('pickupLocations', form.pickupLocations.filter((_, i) => i !== index))
                }
                aria-label={`Quitar punto ${index + 1}`}
                className="grid size-9 place-items-center self-end rounded-control border border-slate-300 text-status-danger hover:bg-slate-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() =>
            update('pickupLocations', [
              ...form.pickupLocations,
              { name: '', address: '', offsetMinutes: -30, extraCost: 0, isActive: true },
            ])
          }
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar punto
        </Button>
      </Section>

      <Section title={`Preguntas frecuentes (${form.faqs.length})`}>
        <div className="space-y-3">
          {form.faqs.map((faq, index) => (
            <div key={index} className="rounded-control border border-slate-200 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.75rem] font-semibold text-slate-600">
                  Pregunta {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => update('faqs', form.faqs.filter((_, i) => i !== index))}
                  className="text-[0.75rem] text-status-danger hover:underline"
                >
                  Quitar
                </button>
              </div>

              <input
                value={faq.question}
                onChange={(event) => {
                  const next = [...form.faqs]
                  next[index] = { ...faq, question: event.target.value }
                  update('faqs', next)
                }}
                placeholder="Pregunta"
                aria-label={`Pregunta ${index + 1}`}
                className="admin-input"
              />
              <textarea
                value={faq.answer}
                onChange={(event) => {
                  const next = [...form.faqs]
                  next[index] = { ...faq, answer: event.target.value }
                  update('faqs', next)
                }}
                rows={3}
                placeholder="Respuesta"
                aria-label={`Respuesta ${index + 1}`}
                className="admin-input mt-2"
              />
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() =>
            update('faqs', [...form.faqs, { question: '', answer: '', isPublished: true }])
          }
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar pregunta
        </Button>
      </Section>

      <Section title="Información importante y cancelación">
        <Field label="Información importante" hint="Requisitos, restricciones, qué llevar. Admite Markdown.">
          <textarea
            value={form.importantInfo}
            onChange={(event) => update('importantInfo', event.target.value)}
            rows={6}
            className="admin-input font-mono text-[0.8125rem]"
          />
        </Field>

        <Field label="Política de cancelación" hint="Específica de esta excursión. Admite Markdown.">
          <textarea
            value={form.cancellationPolicy}
            onChange={(event) => update('cancellationPolicy', event.target.value)}
            rows={6}
            className="admin-input font-mono text-[0.8125rem]"
          />
        </Field>
      </Section>

      <Section title="SEO">
        <p className="mb-3 text-[0.8125rem] text-slate-500">
          Dejá los campos vacíos para usar los valores derivados del nombre y el resumen.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título SEO" hint={`${form.seo.title.length}/70 caracteres`}>
            <input
              value={form.seo.title}
              maxLength={70}
              onChange={(event) => update('seo', { ...form.seo, title: event.target.value })}
              className="admin-input"
            />
          </Field>

          <Field label="URL canónica" hint="Solo si esta página duplica otra">
            <input
              type="url"
              value={form.seo.canonicalUrl}
              onChange={(event) => update('seo', { ...form.seo, canonicalUrl: event.target.value })}
              className="admin-input"
            />
          </Field>
        </div>

        <Field label="Descripción SEO" hint={`${form.seo.description.length}/160 caracteres recomendados`}>
          <textarea
            value={form.seo.description}
            maxLength={180}
            rows={2}
            onChange={(event) => update('seo', { ...form.seo, description: event.target.value })}
            className="admin-input"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título Open Graph">
            <input
              value={form.seo.ogTitle}
              onChange={(event) => update('seo', { ...form.seo, ogTitle: event.target.value })}
              className="admin-input"
            />
          </Field>

          <Field label="Imagen Open Graph (URL)" hint="1200×630 px recomendado">
            <input
              type="url"
              value={form.seo.ogImageUrl}
              onChange={(event) => update('seo', { ...form.seo, ogImageUrl: event.target.value })}
              className="admin-input"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6">
          <Checkbox
            label="noindex (no aparecer en buscadores)"
            checked={form.seo.noindex}
            onChange={(checked) => update('seo', { ...form.seo, noindex: checked })}
          />
          <Checkbox
            label="nofollow"
            checked={form.seo.nofollow}
            onChange={(checked) => update('seo', { ...form.seo, nofollow: checked })}
          />
        </div>
      </Section>

      {/* Sticky action bar: the form is long, and saving should never require
          scrolling to the bottom. */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="button" variant="outline" onClick={() => router.push('/tours')} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {form.id ? 'Guardar cambios' : 'Crear excursión'}
        </Button>
      </div>
    </form>
  )
}

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="admin-panel overflow-hidden">
      <h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50"
        >
          <span className="text-[0.875rem] font-semibold text-slate-900">{title}</span>
          <ChevronDown
            className={cn('size-4 text-slate-500 transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </h2>

      {open ? <div className="space-y-4 border-t border-slate-200 p-4">{children}</div> : null}
    </section>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="admin-label">
        {label}
        {required ? <span className="ml-0.5 text-status-danger">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-[0.75rem] text-status-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[0.75rem] text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-slate-400 text-glacier-700 focus:ring-2 focus:ring-glacier-600"
      />
      <span className="text-[0.8125rem] text-slate-700">{label}</span>
    </label>
  )
}
