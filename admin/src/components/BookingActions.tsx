'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { formatMoney } from '@vamos/shared'
import { Alert, Button } from '@/components/ui/primitives'
import {
  refundBookingAction, updateBookingNotesAction, updateBookingStatusAction,
} from '@/server/actions/bookings'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * Operator controls for a booking.
 *
 * Only transitions that are legal from the current status are offered, so the
 * UI cannot invite an action the server will refuse. The server re-checks the
 * state machine regardless.
 *
 * Destructive actions (cancel, refund) go through a confirmation dialog that
 * requires a typed reason — that reason is both audited and emailed.
 */

const TRANSITIONS: Record<string, { to: string; label: string; destructive?: boolean }[]> = {
  PENDING: [
    { to: 'CONFIRMED', label: 'Confirmar reserva' },
    { to: 'CANCELLED', label: 'Cancelar reserva', destructive: true },
  ],
  AWAITING_PAYMENT: [
    { to: 'PAID', label: 'Marcar como pagada' },
    { to: 'CANCELLED', label: 'Cancelar reserva', destructive: true },
  ],
  PAID: [
    { to: 'CONFIRMED', label: 'Confirmar reserva' },
    { to: 'CANCELLED', label: 'Cancelar reserva', destructive: true },
  ],
  CONFIRMED: [
    { to: 'COMPLETED', label: 'Marcar como completada' },
    { to: 'CANCELLED', label: 'Cancelar reserva', destructive: true },
  ],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
}

export function BookingActions({
  bookingId,
  currentStatus,
  internalNotes,
  canRefund,
  payment,
}: {
  bookingId: string
  currentStatus: string
  internalNotes: string
  canRefund: boolean
  payment: { id: string; refundableCents: number; currency: string } | null
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [notes, setNotes] = useState(internalNotes)
  const [dialog, setDialog] = useState<{ to: string; label: string } | null>(null)
  const [refundOpen, setRefundOpen] = useState(false)

  const available = TRANSITIONS[currentStatus] ?? []

  function changeStatus(to: string, reason?: string, notifyCustomer = true) {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await updateBookingStatusAction({
        bookingId,
        status: to,
        reason,
        notifyCustomer,
      })

      if (!result.ok) setError(result.message)
      else setSuccess('Estado actualizado.')
      setDialog(null)
    })
  }

  function saveNotes() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await updateBookingNotesAction(bookingId, notes)
      if (!result.ok) setError(result.message)
      else setSuccess('Notas guardadas.')
    })
  }

  function refund(amountCents: number, reason: string) {
    if (!payment) return
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      const result = await refundBookingAction({
        paymentId: payment.id,
        amountCents,
        reason,
      })
      if (!result.ok) setError(result.message)
      else setSuccess('Reembolso procesado.')
      setRefundOpen(false)
    })
  }

  return (
    <section className="admin-panel p-4">
      <h2 className="text-[0.8125rem] font-semibold text-slate-900">Acciones</h2>

      {error ? (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      {success ? (
        <div className="mt-3">
          <Alert tone="success">{success}</Alert>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {available.length === 0 ? (
          <p className="text-[0.8125rem] text-slate-500">
            No hay transiciones disponibles desde el estado actual.
          </p>
        ) : (
          available.map((transition) => (
            <Button
              key={transition.to}
              variant={transition.destructive ? 'danger' : 'primary'}
              size="sm"
              className="w-full"
              disabled={pending}
              onClick={() => {
                if (transition.destructive) setDialog(transition)
                else changeStatus(transition.to)
              }}
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              {transition.label}
            </Button>
          ))
        )}

        {canRefund && payment && payment.refundableCents > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={() => setRefundOpen(true)}
          >
            Reembolsar {formatMoney(payment.refundableCents, payment.currency)}
          </Button>
        ) : null}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <label htmlFor="internal-notes" className="admin-label">
          Notas internas
        </label>
        <textarea
          id="internal-notes"
          rows={4}
          value={notes}
          maxLength={2000}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Visible solo para el equipo. Nunca se muestra al cliente."
          className="admin-input"
        />
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          disabled={pending || notes === internalNotes}
          onClick={saveNotes}
        >
          Guardar notas
        </Button>
      </div>

      {dialog ? (
        <ConfirmDialog
          title={dialog.label}
          description="Se liberan los lugares reservados y, si está activado, se envía un correo al cliente. Indicá el motivo: queda registrado y se incluye en la notificación."
          confirmLabel={dialog.label}
          requireReason
          destructive
          pending={pending}
          onCancel={() => setDialog(null)}
          onConfirm={(reason) => changeStatus(dialog.to, reason)}
        />
      ) : null}

      {refundOpen && payment ? (
        <ConfirmDialog
          title="Procesar reembolso"
          description={`Se reembolsarán ${formatMoney(payment.refundableCents, payment.currency)} a través del proveedor de pago. Esta operación no puede deshacerse desde el panel.`}
          confirmLabel="Reembolsar"
          requireReason
          destructive
          pending={pending}
          onCancel={() => setRefundOpen(false)}
          onConfirm={(reason) => refund(payment.refundableCents, reason)}
        />
      ) : null}
    </section>
  )
}
