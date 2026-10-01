'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/primitives'
import { getMediaByIdsAction } from '@/server/actions/media'
import { MediaPicker, type PickedMedia } from './MediaPicker'
import { cn } from '@/lib/utils'

/**
 * Single-image field — hero images, covers.
 *
 * Holds the media id in form state and renders a live thumbnail, so an editor
 * can see what they picked without leaving the form.
 */
export function SingleImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [resolved, setResolved] = useState<PickedMedia | null>(null)

  /**
   * Derived, not stored: when `value` is empty there is nothing to show, and
   * when it points at something other than the cached item the cache is
   * stale. Clearing this through an effect would mean an extra render and a
   * frame of wrong content.
   */
  const media = value && resolved?.id === value ? resolved : null

  // Resolve a stored id to its URL — the form loads with ids, not URLs.
  useEffect(() => {
    if (!value || resolved?.id === value) return

    let cancelled = false
    // Every state update happens after an await, so the effect body itself
    // never triggers a synchronous re-render.
    void (async () => {
      const result = await getMediaByIdsAction([value])
      if (!cancelled && result.ok) setResolved(result.data[0] ?? null)
    })()

    return () => {
      cancelled = true
    }
  }, [value, resolved?.id])

  return (
    <div>
      <label className="admin-label">{label}</label>

      {media ? (
        <div className="flex items-start gap-3">
          <div className="relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-control bg-surface-strong ring-1 ring-border">
            <Image
              src={media.url}
              alt={media.altText || media.filename}
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-medium text-heading">
              {media.filename}
            </p>

            {media.altText ? (
              <p className="mt-0.5 truncate text-[0.75rem] text-subtle-foreground">{media.altText}</p>
            ) : (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[0.75rem] text-status-warning">
                <AlertTriangle className="size-3" aria-hidden="true" />
                Falta texto alternativo
              </p>
            )}

            <div className="mt-2 flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
                Cambiar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
              >
                Quitar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-[4/3] w-40 flex-col items-center justify-center gap-1.5 rounded-control border-2 border-dashed border-border-strong bg-surface-muted text-subtle-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <ImagePlus className="size-5" aria-hidden="true" />
          <span className="text-[0.75rem] font-medium">Elegir imagen</span>
        </button>
      )}

      {hint ? <p className="mt-1.5 text-[0.75rem] text-subtle-foreground">{hint}</p> : null}

      <MediaPicker
        open={open}
        multiple={false}
        selectedIds={value ? [value] : []}
        onClose={() => setOpen(false)}
        onConfirm={(picked) => {
          const first = picked[0]
          onChange(first?.id ?? '')
          setResolved(first ?? null)
        }}
      />
    </div>
  )
}

/**
 * Gallery field — an ordered set of images with one designated cover.
 *
 * Order is explicit and editable: it is the order the public gallery renders,
 * and "whatever order they were uploaded in" is rarely the right one.
 */
export function GalleryField({
  label,
  hint,
  value,
  coverId,
  onChange,
  onCoverChange,
}: {
  label: string
  hint?: string
  value: string[]
  coverId: string
  onChange: (ids: string[]) => void
  onCoverChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [resolved, setResolved] = useState<PickedMedia[]>([])

  // `key` collapses the id array into a stable dependency — a new array with
  // the same contents would otherwise re-run the effect on every render.
  const key = value.join(',')

  /**
   * Derived: show the cached items in the order `value` specifies, and drop
   * any that are no longer selected. Reordering and removal then need no
   * refetch and no effect at all.
   */
  const byId = new Map(resolved.map((item) => [item.id, item]))
  const media = value
    .map((id) => byId.get(id))
    .filter((item): item is PickedMedia => Boolean(item))

  useEffect(() => {
    if (value.length === 0) return
    // Only fetch ids that are not already cached.
    const missing = value.filter((id) => !resolved.some((item) => item.id === id))
    if (missing.length === 0) return

    let cancelled = false
    void (async () => {
      const result = await getMediaByIdsAction(missing)
      if (!cancelled && result.ok) {
        setResolved((current) => [...current, ...result.data])
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    onChange(next)
  }

  function remove(id: string) {
    onChange(value.filter((x) => x !== id))
    if (coverId === id) onCoverChange('')
  }

  const effectiveCover = coverId || value[0] || ''

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="admin-label mb-0">{label}</label>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <ImagePlus className="size-3.5" aria-hidden="true" />
          {value.length > 0 ? 'Editar galería' : 'Agregar imágenes'}
        </Button>
      </div>

      {media.length === 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-control border-2 border-dashed border-border-strong bg-surface-muted py-8 text-subtle-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <ImagePlus className="size-6" aria-hidden="true" />
          <span className="text-[0.8125rem] font-medium">Agregar imágenes a la galería</span>
          <span className="text-[0.6875rem]">
            Sin imágenes, el sitio muestra una ilustración generada
          </span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {media.map((item, index) => {
            const isCover = item.id === effectiveCover

            return (
              <li key={item.id} className="group relative">
                <div
                  className={cn(
                    'relative aspect-[4/3] overflow-hidden rounded-control bg-surface-strong ring-2 transition-all',
                    isCover ? 'ring-primary' : 'ring-border',
                  )}
                >
                  <Image
                    src={item.url}
                    alt={item.altText || item.filename}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />

                  {isCover ? (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[0.625rem] font-semibold text-white">
                      <Star className="size-2.5 fill-current" aria-hidden="true" />
                      Portada
                    </span>
                  ) : null}

                  {!item.altText ? (
                    <span
                      className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-status-warningBg text-status-warning"
                      title="Falta texto alternativo"
                    >
                      <AlertTriangle className="size-3" aria-hidden="true" />
                    </span>
                  ) : null}
                </div>

                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover ${item.filename} antes`}
                      className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-surface-strong disabled:opacity-30"
                    >
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === media.length - 1}
                      aria-label={`Mover ${item.filename} después`}
                      className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-surface-strong disabled:opacity-30"
                    >
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex gap-0.5">
                    {!isCover ? (
                      <button
                        type="button"
                        onClick={() => onCoverChange(item.id)}
                        aria-label={`Usar ${item.filename} como portada`}
                        title="Usar como portada"
                        className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-surface-strong hover:text-primary"
                      >
                        <Star className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`Quitar ${item.filename}`}
                      className="grid size-6 place-items-center rounded text-status-danger hover:bg-status-dangerBg"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {hint ? <p className="mt-2 text-[0.75rem] text-subtle-foreground">{hint}</p> : null}

      <MediaPicker
        open={open}
        multiple
        selectedIds={value}
        onClose={() => setOpen(false)}
        onConfirm={(picked) => {
          const ids = picked.map((p) => p.id)
          setResolved(picked)
          onChange(ids)
          if (!ids.includes(coverId)) onCoverChange(ids[0] ?? '')
        }}
      />
    </div>
  )
}
