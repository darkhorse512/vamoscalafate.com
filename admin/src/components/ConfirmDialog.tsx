'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/primitives'

/**
 * Confirmation dialog for destructive actions.
 *
 * Implements the full modal contract: focus moves in on open, is trapped while
 * open, Escape cancels, and the backdrop is a real button so a pointer user
 * can dismiss it. A destructive action should never be one stray click away.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  requireReason = false,
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  confirmLabel: string
  requireReason?: boolean
  destructive?: boolean
  pending?: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const firstField = panelRef.current?.querySelector<HTMLElement>('textarea, button')
    firstField?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) {
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, input',
      )
      if (focusable.length === 0) return

      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onCancel, pending])

  const canConfirm = !pending && (!requireReason || reason.trim().length >= 3)

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <button
        type="button"
        aria-label="Cancelar"
        onClick={() => !pending && onCancel()}
        className="absolute inset-0 bg-slate-950/55"
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-md rounded-panel bg-white p-5 shadow-panel"
      >
        <div className="flex gap-3">
          {destructive ? (
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full bg-status-dangerBg text-status-danger"
              aria-hidden="true"
            >
              <AlertTriangle className="size-4" />
            </span>
          ) : null}

          <div className="min-w-0">
            <h2 id="confirm-title" className="text-[0.9375rem] font-semibold text-slate-900">
              {title}
            </h2>
            <p id="confirm-description" className="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-600">
              {description}
            </p>
          </div>
        </div>

        {requireReason ? (
          <div className="mt-4">
            <label htmlFor="confirm-reason" className="admin-label">
              Motivo <span className="text-status-danger">*</span>
            </label>
            <textarea
              id="confirm-reason"
              rows={3}
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Mínimo 3 caracteres. Queda registrado en la auditoría."
              className="admin-input"
            />
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            size="sm"
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
