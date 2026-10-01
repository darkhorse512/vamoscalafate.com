'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Alert, Button } from '@/components/ui/primitives'
import { saveStaticPageAction } from '@/server/actions/content'

/**
 * Legal page editor.
 *
 * Legal copy changes on legal advice, not on a deploy cycle, so it lives in
 * the database and is edited here. The warning is deliberate: the shipped
 * templates are scaffolding and must be reviewed before an operator relies on
 * them.
 */
export function LegalPageEditor({
  pageId,
  initial,
}: {
  pageId: string
  initial: { title: string; slug: string; content: string; status: string }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const hasPlaceholders = form.content.includes('«')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)

    startTransition(async () => {
      const result = await saveStaticPageAction(pageId, {
        title: form.title,
        slug: form.slug,
        content: form.content,
        status: form.status,
      })

      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }

      setMessage({ tone: 'success', text: 'Página guardada y publicada en el sitio.' })
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {hasPlaceholders ? (
        <Alert tone="warning" title="Contiene marcadores sin completar">
          El texto todavía tiene campos entre «comillas angulares» que hay que reemplazar con los
          datos reales de la empresa. Hacé revisar el documento por un profesional antes de operar.
        </Alert>
      ) : null}

      <div className="admin-panel space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lp-title" className="admin-label">
              Título
            </label>
            <input
              id="lp-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              className="admin-input"
            />
          </div>

          <div>
            <label htmlFor="lp-status" className="admin-label">
              Estado
            </label>
            <select
              id="lp-status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="admin-input"
            >
              <option value="PUBLISHED">Publicada</option>
              <option value="DRAFT">Borrador</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="lp-content" className="admin-label">
            Contenido (Markdown)
          </label>
          <textarea
            id="lp-content"
            value={form.content}
            onChange={(event) => setForm({ ...form, content: event.target.value })}
            rows={28}
            required
            className="admin-input font-mono text-[0.8125rem] leading-relaxed"
          />
          <p className="mt-1 text-[0.75rem] text-subtle-foreground">
            Admite ## títulos, **negrita**, listas, tablas y &gt; citas.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/settings')} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Guardar y publicar
        </Button>
      </div>
    </form>
  )
}
