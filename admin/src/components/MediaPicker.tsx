'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { AlertTriangle, Check, Loader2, Search, Upload, X } from 'lucide-react'
import { Alert, Button } from '@/components/ui/primitives'
import { listMediaAction, updateMediaAction, uploadMediaAction } from '@/server/actions/media'
import { cn } from '@/lib/utils'

export type PickedMedia = {
  id: string
  url: string
  filename: string
  altText: string
}

/**
 * Media picker dialog.
 *
 * One surface for the whole job: upload new files, browse what exists, fix
 * missing alt text, and select. Sending an editor to a separate library page
 * and back loses the form state they were part-way through.
 *
 * Uploads go through the server action, which validates MIME type, size and
 * magic bytes before anything touches disk.
 */
export function MediaPicker(props: {
  open: boolean
  multiple: boolean
  selectedIds: string[]
  onClose: () => void
  onConfirm: (media: PickedMedia[]) => void
}) {
  // Mounting the dialog only while open lets its state initialise straight
  // from props, instead of being reset by an effect on every open.
  if (!props.open) return null
  return <MediaPickerDialog {...props} />
}

function MediaPickerDialog({
  multiple,
  selectedIds,
  onClose,
  onConfirm,
}: {
  open: boolean
  multiple: boolean
  selectedIds: string[]
  onClose: () => void
  onConfirm: (media: PickedMedia[]) => void
}) {
  const [items, setItems] = useState<
    (PickedMedia & { type: string; sizeLabel: string })[]
  >([])
  const [selection, setSelection] = useState<string[]>(selectedIds)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(
    async (targetPage: number, search: string, append: boolean) => {
      setLoading(true)
      const result = await listMediaAction({ page: targetPage, query: search || undefined, type: 'IMAGE' })
      setLoading(false)

      if (!result.ok) {
        setError(result.message)
        return
      }

      setItems((current) => (append ? [...current, ...result.data.items] : result.data.items))
      setHasMore(result.data.hasMore)
    },
    [],
  )

  // Initial load. Every state update happens after an await, so the effect
  // body does not trigger a synchronous re-render.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const result = await listMediaAction({ page: 1, type: 'IMAGE' })
      if (cancelled) return
      if (!result.ok) {
        setError(result.message)
        return
      }
      setItems(result.data.items)
      setHasMore(result.data.hasMore)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Modal contract: lock scroll, close on Escape.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, pending])

  async function upload(files: FileList | File[]) {
    const list = Array.from(files)
    if (list.length === 0) return
    setError(null)

    const uploadedIds: string[] = []

    for (const [index, file] of list.entries()) {
      setUploadProgress(`Subiendo ${index + 1} de ${list.length}: ${file.name}`)

      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadMediaAction(formData)
      if (!result.ok) {
        setError(`${file.name}: ${result.message}`)
        setUploadProgress(null)
        return
      }
      uploadedIds.push(result.data.id)
    }

    setUploadProgress(null)
    if (fileInput.current) fileInput.current.value = ''

    // Freshly uploaded files are almost always what the editor wants, so
    // select them and put them at the top of the list.
    setSelection((current) => (multiple ? [...current, ...uploadedIds] : uploadedIds.slice(-1)))
    await load(1, query, false)
    setPage(1)
  }

  function toggle(id: string) {
    setSelection((current) => {
      if (!multiple) return current.includes(id) ? [] : [id]
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    })
  }

  function confirm() {
    const byId = new Map(items.map((item) => [item.id, item]))
    // Preserve click order — it becomes the gallery order.
    const picked = selection
      .map((id) => byId.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map(({ id, url, filename, altText }) => ({ id, url, filename, altText }))

    onConfirm(picked)
    onClose()
  }

  function saveAlt(id: string, altText: string) {
    startTransition(async () => {
      const result = await updateMediaAction({ id, altText })
      if (result.ok) {
        setItems((current) => current.map((i) => (i.id === id ? { ...i, altText } : i)))
      }
    })
  }

  const missingAlt = items.filter((i) => selection.includes(i.id) && !i.altText).length

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => !pending && onClose()}
        className="absolute inset-0 bg-slate-950/60"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Seleccionar imágenes"
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col rounded-panel bg-surface shadow-panel"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-heading">
              {multiple ? 'Seleccionar imágenes' : 'Seleccionar imagen'}
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-subtle-foreground">
              {selection.length} seleccionada{selection.length === 1 ? '' : 's'}
              {multiple ? ' · el orden de selección define el orden de la galería' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 place-items-center rounded-control text-subtle-foreground hover:bg-surface-strong"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Upload + search */}
        <div className="shrink-0 space-y-3 border-b border-border p-4">
          {error ? <Alert tone="danger">{error}</Alert> : null}

          {missingAlt > 0 ? (
            <Alert tone="warning">
              {missingAlt} de las imágenes seleccionadas no tiene texto alternativo. Completalo
              debajo de cada miniatura: es necesario para accesibilidad y para el SEO de imágenes.
            </Alert>
          ) : null}

          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              void upload(event.dataTransfer.files)
            }}
            className={cn(
              'rounded-control border-2 border-dashed p-4 text-center transition-colors',
              dragging ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface-muted',
            )}
          >
            {uploadProgress ? (
              <p className="inline-flex items-center gap-2 text-[0.8125rem] text-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {uploadProgress}
              </p>
            ) : (
              <>
                <Upload className="mx-auto size-5 text-subtle-foreground" aria-hidden="true" />
                <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">
                  Arrastrá imágenes acá, o{' '}
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="font-medium text-primary underline hover:text-primary-hover"
                  >
                    elegí archivos
                  </button>
                </p>
                <p className="mt-1 text-[0.6875rem] text-subtle-foreground">
                  JPG, PNG, WebP o AVIF · máximo 8 MB cada una
                </p>
              </>
            )}

            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => event.target.files && void upload(event.target.files)}
              className="sr-only"
            />
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
              aria-hidden="true"
            />
            <label htmlFor="media-search" className="sr-only">
              Buscar en la biblioteca
            </label>
            <input
              id="media-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
                void load(1, event.target.value, false)
              }}
              placeholder="Buscar por nombre o texto alternativo…"
              className="admin-input pl-9"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && items.length === 0 ? (
            <p className="py-12 text-center text-[0.8125rem] text-subtle-foreground">Cargando…</p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[0.8125rem] text-muted-foreground">
                {query ? 'Sin resultados para esa búsqueda.' : 'La biblioteca está vacía.'}
              </p>
              {!query ? (
                <p className="mt-1 text-[0.75rem] text-subtle-foreground">
                  Subí las primeras fotos arrastrándolas al recuadro de arriba.
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((item) => {
                const index = selection.indexOf(item.id)
                const isSelected = index !== -1

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        'relative block w-full overflow-hidden rounded-control ring-2 transition-all',
                        isSelected
                          ? 'ring-primary'
                          : 'ring-transparent hover:ring-border-strong',
                      )}
                    >
                      <span className="relative block aspect-[4/3] bg-surface-strong">
                        <Image
                          src={item.url}
                          alt={item.altText || item.filename}
                          fill
                          sizes="200px"
                          className="object-cover"
                        />
                      </span>

                      {isSelected ? (
                        <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-violet-600 text-[0.6875rem] font-bold text-white">
                          {multiple ? index + 1 : <Check className="size-3.5" aria-hidden="true" />}
                        </span>
                      ) : null}

                      {!item.altText ? (
                        <span
                          className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-status-warningBg text-status-warning"
                          title="Falta texto alternativo"
                        >
                          <AlertTriangle className="size-3.5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>

                    <p className="mt-1 truncate text-[0.6875rem] text-subtle-foreground" title={item.filename}>
                      {item.filename}
                    </p>

                    {isSelected ? (
                      <input
                        defaultValue={item.altText}
                        onBlur={(event) => saveAlt(item.id, event.target.value)}
                        placeholder="Texto alternativo…"
                        aria-label={`Texto alternativo de ${item.filename}`}
                        className="mt-1 w-full rounded border border-border-strong px-1.5 py-1 text-[0.6875rem] focus:border-primary focus:outline-none"
                      />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}

          {hasMore ? (
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  const next = page + 1
                  setPage(next)
                  void load(next, query, true)
                }}
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                Cargar más
              </Button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={() => setSelection([])}
            className="text-[0.8125rem] text-subtle-foreground hover:text-heading"
          >
            Limpiar selección
          </button>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={confirm} disabled={pending}>
              Usar {selection.length > 0 ? `(${selection.length})` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
