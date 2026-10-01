'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Alert, Button } from '@/components/ui/primitives'
import { reviewSubmissionAction } from '@/server/actions/submissions'

/**
 * Submission review controls.
 *
 * Approval is the only action that creates a public listing, so it is
 * deliberately the most explicit: the button states plainly that it publishes,
 * and the outcome shows the resulting public URL.
 *
 * Rejection and "needs information" require a note, because that note is what
 * the applicant receives - sending "rejected" with no explanation would be a
 * poor experience for a local business.
 */
export function SubmissionReview({
  submissionId,
  currentStatus,
  alreadyPublished,
}: {
  submissionId: string
  currentStatus: string
  alreadyPublished: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [notes, setNotes] = useState('')
  const [notify, setNotify] = useState(true)
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const isFinal = ['APPROVED', 'REJECTED'].includes(currentStatus)

  function review(status: string) {
    setMessage(null)

    startTransition(async () => {
      const result = await reviewSubmissionAction({
        submissionId,
        status,
        reviewNotes: notes,
        notifyApplicant: notify,
      })

      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }

      setMessage({
        tone: 'success',
        text: result.data.publicUrl
          ? `Aprobada y publicada: ${result.data.publicUrl}`
          : 'Solicitud actualizada.',
      })
      router.refresh()
    })
  }

  const notesRequired = notes.trim().length >= 10

  return (
    <section className="admin-panel p-4">
      <h2 className="text-[0.8125rem] font-semibold text-heading">Revisión</h2>

      {message ? (
        <div className="mt-3">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      ) : null}

      {isFinal ? (
        <p className="mt-2 text-[0.8125rem] text-subtle-foreground">
          Esta solicitud ya tiene una decisión final. Podés cambiarla, pero avisale al solicitante.
        </p>
      ) : null}

      <div className="mt-3">
        <label htmlFor="review-notes" className="admin-label">
          Notas para el solicitante
        </label>
        <textarea
          id="review-notes"
          rows={4}
          value={notes}
          maxLength={2000}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Obligatorio al rechazar o pedir datos. Se incluye en el correo."
          className="admin-input"
        />
      </div>

      <label className="mt-3 inline-flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={notify}
          onChange={(event) => setNotify(event.target.checked)}
          className="size-4 rounded border-border-strong text-primary focus:ring-2 focus:ring-primary"
        />
        <span className="text-[0.8125rem] text-foreground">Notificar por correo al solicitante</span>
      </label>

      <div className="mt-4 space-y-2">
        {currentStatus === 'PENDING' ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={() => review('UNDER_REVIEW')}
          >
            Marcar en revisión
          </Button>
        ) : null}

        <Button
          size="sm"
          className="w-full"
          disabled={pending || alreadyPublished}
          onClick={() => review('APPROVED')}
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          {alreadyPublished ? 'Ya publicada' : 'Aprobar y publicar'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={pending || !notesRequired}
          onClick={() => review('NEEDS_INFORMATION')}
          title={!notesRequired ? 'Escribí al menos 10 caracteres explicando qué falta' : undefined}
        >
          Pedir más información
        </Button>

        <Button
          variant="danger"
          size="sm"
          className="w-full"
          disabled={pending || !notesRequired}
          onClick={() => review('REJECTED')}
          title={!notesRequired ? 'Escribí al menos 10 caracteres explicando el motivo' : undefined}
        >
          Rechazar
        </Button>
      </div>

      {!notesRequired ? (
        <p className="mt-2 text-[0.75rem] text-subtle-foreground">
          Para rechazar o pedir datos, escribí al menos 10 caracteres en las notas.
        </p>
      ) : null}
    </section>
  )
}
