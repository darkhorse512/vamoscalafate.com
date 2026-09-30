'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { readingTimeMinutes, slugify } from '@vamos/shared'
import { Alert, Button } from '@/components/ui/primitives'
import { saveBlogPostAction } from '@/server/actions/content'
import type { BlogFormData } from '@/lib/blog-form-data'
import { cn } from '@/lib/utils'

/**
 * Blog editor.
 *
 * Markdown with a live preview rather than a WYSIWYG: the public renderer is
 * a Markdown renderer, so editing the same source avoids the class of bug
 * where the editor and the site disagree about what the content is.
 */

export function BlogEditor({
  initial,
  categories,
  destinations,
  tags,
}: {
  initial: BlogFormData
  categories: { id: string; name: string }[]
  destinations: { id: string; name: string }[]
  tags: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [preview, setPreview] = useState(false)

  function update<K extends keyof BlogFormData>(key: K, value: BlogFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const result = await saveBlogPostAction(form.id ?? null, {
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt,
        content: form.content,
        status: form.status,
        categoryId: form.categoryId || null,
        destinationId: form.destinationId || null,
        tagIds: form.tagIds,
        featured: form.featured,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
        faqs: [],
        seo: form.seo,
      })

      if (!result.ok) {
        setError(result.message)
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      router.push('/blog')
      router.refresh()
    })
  }

  const scheduled = form.publishedAt && new Date(form.publishedAt) > new Date()

  return (
    <form onSubmit={submit} className="space-y-5 pb-20">
      {error ? <Alert tone="danger" title="No se pudo guardar">{error}</Alert> : null}

      {form.seo.noindex && form.status === 'PUBLISHED' ? (
        <Alert tone="warning" title="Este artículo no se indexará">
          Está publicado pero con «noindex» activo, así que no aparecerá en Google.
        </Alert>
      ) : null}

      {scheduled && form.status === 'PUBLISHED' ? (
        <Alert tone="info" title="Publicación programada">
          El artículo se publicará automáticamente el{' '}
          {new Date(form.publishedAt).toLocaleString('es-AR')}. Hasta entonces no será visible.
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-5">
          <section className="admin-panel space-y-4 p-4">
            <div>
              <label htmlFor="title" className="admin-label">
                Título <span className="text-status-danger">*</span>
              </label>
              <input
                id="title"
                value={form.title}
                onChange={(event) => {
                  update('title', event.target.value)
                  if (!form.id) update('slug', slugify(event.target.value))
                }}
                required
                className="admin-input text-[1rem] font-medium"
              />
              {fieldErrors.title ? (
                <p role="alert" className="mt-1 text-[0.75rem] text-status-danger">
                  {fieldErrors.title[0]}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="slug" className="admin-label">
                Slug (URL) <span className="text-status-danger">*</span>
              </label>
              <input
                id="slug"
                value={form.slug}
                onChange={(event) => update('slug', event.target.value)}
                required
                className="admin-input font-mono text-[0.8125rem]"
              />
              <p className="mt-1 text-[0.75rem] text-slate-500">
                /blog/{form.slug || 'sin-slug'}
              </p>
            </div>

            <div>
              <label htmlFor="excerpt" className="admin-label">
                Extracto <span className="text-status-danger">*</span>
              </label>
              <textarea
                id="excerpt"
                value={form.excerpt}
                onChange={(event) => update('excerpt', event.target.value)}
                rows={2}
                maxLength={320}
                required
                className="admin-input"
              />
              <p className="mt-1 text-[0.75rem] text-slate-500">
                {form.excerpt.length}/320 · aparece en las tarjetas y como descripción por defecto
              </p>
            </div>
          </section>

          <section className="admin-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <h2 className="text-[0.8125rem] font-semibold text-slate-900">Contenido (Markdown)</h2>
              <button
                type="button"
                onClick={() => setPreview(!preview)}
                aria-pressed={preview}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[0.75rem] font-medium transition-colors',
                  preview ? 'bg-glacier-50 text-glacier-800' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <Eye className="size-3.5" aria-hidden="true" />
                {preview ? 'Editar' : 'Vista previa'}
              </button>
            </div>

            {preview ? (
              <div className="p-4">
                <MarkdownPreview content={form.content} />
              </div>
            ) : (
              <>
                <label htmlFor="content" className="sr-only">
                  Contenido del artículo
                </label>
                <textarea
                  id="content"
                  value={form.content}
                  onChange={(event) => update('content', event.target.value)}
                  rows={24}
                  required
                  placeholder={'## Un subtítulo\n\nUn párrafo con **negrita** y un [enlace](/excursiones).\n\n- Un ítem\n- Otro ítem'}
                  className="w-full resize-y border-0 bg-transparent p-4 font-mono text-[0.8125rem] leading-relaxed text-slate-800 focus:outline-none focus:ring-0"
                />
              </>
            )}

            <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[0.75rem] text-slate-500">
              {form.content.trim().split(/\s+/).filter(Boolean).length} palabras ·{' '}
              {readingTimeMinutes(form.content)} min de lectura
            </p>
          </section>

          <section className="admin-panel space-y-4 p-4">
            <h2 className="text-[0.8125rem] font-semibold text-slate-900">SEO</h2>

            <div>
              <label htmlFor="seo-title" className="admin-label">
                Título SEO
              </label>
              <input
                id="seo-title"
                value={form.seo.title}
                maxLength={70}
                onChange={(event) => update('seo', { ...form.seo, title: event.target.value })}
                placeholder={form.title}
                className="admin-input"
              />
              <p className="mt-1 text-[0.75rem] text-slate-500">
                {form.seo.title.length}/70 · vacío usa el título del artículo
              </p>
            </div>

            <div>
              <label htmlFor="seo-description" className="admin-label">
                Descripción SEO
              </label>
              <textarea
                id="seo-description"
                value={form.seo.description}
                maxLength={180}
                rows={2}
                onChange={(event) => update('seo', { ...form.seo, description: event.target.value })}
                placeholder={form.excerpt}
                className="admin-input"
              />
              <p className="mt-1 text-[0.75rem] text-slate-500">
                {form.seo.description.length}/160 recomendados · vacío usa el extracto
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.seo.noindex}
                onChange={(event) => update('seo', { ...form.seo, noindex: event.target.checked })}
                className="size-4 rounded border-slate-400 text-glacier-700 focus:ring-2 focus:ring-glacier-600"
              />
              <span className="text-[0.8125rem] text-slate-700">noindex</span>
            </label>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="admin-panel space-y-4 p-4">
            <h2 className="text-[0.8125rem] font-semibold text-slate-900">Publicación</h2>

            <div>
              <label htmlFor="status" className="admin-label">
                Estado
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(event) => update('status', event.target.value)}
                className="admin-input"
              >
                <option value="DRAFT">Borrador</option>
                <option value="IN_REVIEW">En revisión</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Archivado</option>
              </select>
            </div>

            <div>
              <label htmlFor="publishedAt" className="admin-label">
                Fecha de publicación
              </label>
              <input
                id="publishedAt"
                type="datetime-local"
                value={form.publishedAt}
                onChange={(event) => update('publishedAt', event.target.value)}
                className="admin-input"
              />
              <p className="mt-1 text-[0.75rem] text-slate-500">
                Una fecha futura programa la publicación.
              </p>
            </div>

            <div>
              <label htmlFor="category" className="admin-label">
                Categoría
              </label>
              <select
                id="category"
                value={form.categoryId}
                onChange={(event) => update('categoryId', event.target.value)}
                className="admin-input"
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="destination" className="admin-label">
                Destino relacionado
              </label>
              <select
                id="destination"
                value={form.destinationId}
                onChange={(event) => update('destinationId', event.target.value)}
                className="admin-input"
              >
                <option value="">Ninguno</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[0.75rem] text-slate-500">
                Define qué excursiones se sugieren al final del artículo.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => update('featured', event.target.checked)}
                className="size-4 rounded border-slate-400 text-glacier-700 focus:ring-2 focus:ring-glacier-600"
              />
              <span className="text-[0.8125rem] text-slate-700">Destacado</span>
            </label>
          </section>

          {tags.length > 0 ? (
            <section className="admin-panel p-4">
              <h2 className="text-[0.8125rem] font-semibold text-slate-900">Etiquetas</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selected = form.tagIds.includes(tag.id)
                  return (
                    <label
                      key={tag.id}
                      className={cn(
                        'cursor-pointer rounded-full border px-2.5 py-1 text-[0.75rem] transition-colors',
                        selected
                          ? 'border-glacier-600 bg-glacier-50 text-glacier-800'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) =>
                          update(
                            'tagIds',
                            event.target.checked
                              ? [...form.tagIds, tag.id]
                              : form.tagIds.filter((id) => id !== tag.id),
                          )
                        }
                        className="sr-only"
                      />
                      {tag.name}
                    </label>
                  )
                })}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="button" variant="outline" onClick={() => router.push('/blog')} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {form.id ? 'Guardar cambios' : 'Crear artículo'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Minimal preview.
 *
 * Renders escaped text, so nothing in the editor can execute here either.
 * Intentionally simpler than the public renderer: it is an orientation aid,
 * not a pixel-accurate proof.
 */
function MarkdownPreview({ content }: { content: string }) {
  const blocks = content.split('\n\n')

  return (
    <div className="space-y-3 text-[0.875rem] leading-relaxed text-slate-700">
      {blocks.map((block, index) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={index} className="mt-5 text-[1rem] font-semibold text-slate-900">
              {trimmed.slice(3)}
            </h3>
          )
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={index} className="mt-4 text-[0.9375rem] font-semibold text-slate-900">
              {trimmed.slice(4)}
            </h4>
          )
        }
        if (/^[-*]\s/m.test(trimmed)) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {trimmed.split('\n').map((line, i) => (
                <li key={i}>{line.replace(/^[-*]\s+/, '')}</li>
              ))}
            </ul>
          )
        }

        return <p key={index}>{trimmed}</p>
      })}
    </div>
  )
}
