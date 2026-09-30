'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { FileText, Film, Loader2, Upload } from 'lucide-react'
import { Alert, Button } from '@/components/ui/primitives'
import { addVideoAction, updateMediaAction, uploadMediaAction } from '@/server/actions/media'

type MediaItem = {
  id: string
  type: string
  url: string
  filename: string
  mimeType: string
  sizeLabel: string
  altText: string
  uploadedBy: string
  createdAt: string
}

/**
 * Media library.
 *
 * Alt text is surfaced prominently and flagged when missing: every image on
 * the public site needs it for screen-reader users, and it is the single most
 * commonly skipped accessibility field.
 */
export function MediaLibrary({ items }: { items: MediaItem[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    setMessage(null)

    startTransition(async () => {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)

        const result = await uploadMediaAction(formData)
        if (!result.ok) {
          setMessage({ tone: 'danger', text: `${file.name}: ${result.message}` })
          return
        }
      }

      setMessage({ tone: 'success', text: 'Archivos subidos.' })
      if (fileInput.current) fileInput.current.value = ''
      router.refresh()
    })
  }

  function addVideo() {
    if (!videoUrl.trim()) return
    setMessage(null)

    startTransition(async () => {
      const result = await addVideoAction({ externalUrl: videoUrl.trim() })
      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }
      setVideoUrl('')
      setMessage({ tone: 'success', text: 'Video agregado.' })
      router.refresh()
    })
  }

  function saveAlt(item: MediaItem, altText: string) {
    startTransition(async () => {
      const result = await updateMediaAction({ id: item.id, altText })
      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }
      setSelected(null)
      router.refresh()
    })
  }

  return (
    <>
      {message ? (
        <div className="mb-4">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      ) : null}

      <div className="admin-panel mb-6 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="media-upload" className="admin-label">
              Subir archivos
            </label>
            <input
              id="media-upload"
              ref={fileInput}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
              onChange={(event) => upload(event.target.files)}
              disabled={pending}
              className="block w-full text-[0.8125rem] text-slate-600 file:mr-3 file:rounded-control file:border-0 file:bg-glacier-700 file:px-3.5 file:py-2 file:text-[0.8125rem] file:font-medium file:text-white hover:file:bg-glacier-800"
            />
            <p className="mt-1 text-[0.75rem] text-slate-500">
              JPG, PNG, WebP, AVIF o PDF. Máximo 8 MB por imagen. SVG no está permitido por
              seguridad.
            </p>
          </div>

          <div>
            <label htmlFor="media-video" className="admin-label">
              Agregar video (YouTube o Vimeo)
            </label>
            <div className="flex gap-2">
              <input
                id="media-video"
                type="url"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                className="admin-input"
              />
              <Button type="button" size="sm" onClick={addVideo} disabled={pending || !videoUrl}>
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-3.5" aria-hidden="true" />
                )}
                Agregar
              </Button>
            </div>
            <p className="mt-1 text-[0.75rem] text-slate-500">
              Los videos no se alojan: se embeben desde el proveedor.
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="admin-panel px-6 py-14 text-center">
          <p className="text-[0.8125rem] text-slate-500">
            La biblioteca está vacía. Subí las fotos de las excursiones para reemplazar los
            marcadores de posición del sitio público.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="admin-panel group block w-full overflow-hidden text-left transition-colors hover:border-glacier-300"
              >
                <div className="relative aspect-square bg-slate-100">
                  {item.type === 'IMAGE' ? (
                    <Image
                      src={item.url}
                      alt={item.altText || item.filename}
                      fill
                      sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 18vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-slate-400">
                      {item.type === 'VIDEO' ? (
                        <Film className="size-8" aria-hidden="true" />
                      ) : (
                        <FileText className="size-8" aria-hidden="true" />
                      )}
                    </span>
                  )}
                </div>

                <div className="p-2.5">
                  <p className="truncate text-[0.75rem] font-medium text-slate-900">
                    {item.filename}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">{item.sizeLabel}</p>

                  {item.type === 'IMAGE' && !item.altText ? (
                    <p className="mt-1 text-[0.625rem] font-semibold text-status-warning">
                      Falta texto alternativo
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setSelected(null)}
            className="absolute inset-0 bg-slate-950/55"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Detalles de ${selected.filename}`}
            className="relative w-full max-w-md rounded-panel bg-white p-5 shadow-panel"
          >
            <h2 className="truncate text-[0.9375rem] font-semibold text-slate-900">
              {selected.filename}
            </h2>
            <p className="mt-0.5 text-[0.75rem] text-slate-500">
              {selected.mimeType} · {selected.sizeLabel} · {selected.uploadedBy} ·{' '}
              {selected.createdAt}
            </p>

            {selected.type === 'IMAGE' ? (
              <div className="relative mt-4 aspect-video overflow-hidden rounded-control bg-slate-100">
                <Image
                  src={selected.url}
                  alt={selected.altText || selected.filename}
                  fill
                  sizes="448px"
                  className="object-contain"
                />
              </div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                saveAlt(selected, String(form.get('altText') ?? ''))
              }}
              className="mt-4"
            >
              <label htmlFor="alt-text" className="admin-label">
                Texto alternativo
              </label>
              <input
                id="alt-text"
                name="altText"
                defaultValue={selected.altText}
                maxLength={300}
                placeholder="Describí la imagen para quien no puede verla"
                className="admin-input"
              />
              <p className="mt-1 text-[0.75rem] text-slate-500">
                Obligatorio para accesibilidad. Describí el contenido, no repitas el nombre del
                archivo.
              </p>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(null)}
                  disabled={pending}
                >
                  Cerrar
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
