'use client'

import { useState, useTransition } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Alert, Button } from '@/components/ui/primitives'
import { sendTestEmailAction } from '@/server/actions/content'

/**
 * Sends a test message so email configuration can be confirmed rather than
 * assumed. Reports the real outcome — a message that was only logged is
 * reported as not delivered.
 */
export function EmailTester({ defaultTo }: { defaultTo: string }) {
  const [pending, startTransition] = useTransition()
  const [to, setTo] = useState(defaultTo)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  function send() {
    setResult(null)
    startTransition(async () => {
      const response = await sendTestEmailAction(to)
      if (!response.ok) {
        setResult({ ok: false, text: response.message })
        return
      }
      setResult({ ok: response.data.delivered, text: response.data.detail })
    })
  }

  return (
    <div className="admin-panel p-4">
      <h3 className="text-[0.8125rem] font-semibold text-heading">Probar el envío de correo</h3>
      <p className="mt-1 text-[0.75rem] text-subtle-foreground">
        Envía un mensaje real con la configuración actual y muestra el resultado exacto.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <label htmlFor="test-to" className="sr-only">
          Dirección de destino
        </label>
        <input
          id="test-to"
          type="email"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="tu@vamoscalafate.com"
          className="admin-input max-w-xs"
        />
        <Button type="button" size="sm" onClick={send} disabled={pending || !to}>
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-3.5" aria-hidden="true" />
          )}
          Enviar prueba
        </Button>
      </div>

      {result ? (
        <div className="mt-3">
          <Alert tone={result.ok ? 'success' : 'warning'}>{result.text}</Alert>
        </div>
      ) : null}
    </div>
  )
}
