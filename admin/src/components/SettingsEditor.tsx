'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Alert, Button } from '@/components/ui/primitives'
import { updateSiteSettingAction } from '@/server/actions/content'

type Setting = { key: string; group: string; label: string; value: string }

const GROUP_LABELS: Record<string, string> = {
  general: 'General',
  contact: 'Contacto',
  social: 'Redes sociales',
  seo: 'SEO',
}

/**
 * Site settings editor.
 *
 * Saving purges the public cache tag for settings, so a changed hero headline
 * appears on the live homepage without a redeploy.
 */
export function SettingsEditor({ settings }: { settings: Setting[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [values, setValues] = useState(
    Object.fromEntries(settings.map((setting) => [setting.key, setting.value])),
  )
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const groups = [...new Set(settings.map((setting) => setting.group))]

  function save(key: string) {
    setMessage(null)

    startTransition(async () => {
      const raw = values[key] ?? ''
      // Numeric settings round-trip as numbers so the public site does not
      // have to coerce them.
      const parsed = /^-?\d+$/.test(raw) ? Number(raw) : raw

      const result = await updateSiteSettingAction(key, parsed)

      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }

      setMessage({ tone: 'success', text: 'Ajuste guardado y caché del sitio público purgada.' })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {groups.map((group) => (
        <section key={group} className="admin-panel overflow-hidden">
          <h3 className="border-b border-border px-4 py-2.5 text-[0.8125rem] font-semibold text-heading">
            {GROUP_LABELS[group] ?? group}
          </h3>

          <ul className="divide-y divide-border">
            {settings
              .filter((setting) => setting.group === group)
              .map((setting) => {
                const changed = values[setting.key] !== setting.value
                const isLong = setting.value.length > 60

                return (
                  <li key={setting.key} className="p-4">
                    <label htmlFor={setting.key} className="admin-label">
                      {setting.label}
                    </label>

                    <div className="flex flex-wrap items-start gap-2">
                      {isLong ? (
                        <textarea
                          id={setting.key}
                          rows={2}
                          value={values[setting.key] ?? ''}
                          onChange={(event) =>
                            setValues({ ...values, [setting.key]: event.target.value })
                          }
                          className="admin-input flex-1"
                        />
                      ) : (
                        <input
                          id={setting.key}
                          value={values[setting.key] ?? ''}
                          onChange={(event) =>
                            setValues({ ...values, [setting.key]: event.target.value })
                          }
                          className="admin-input flex-1"
                        />
                      )}

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending || !changed}
                        onClick={() => save(setting.key)}
                      >
                        {pending ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : null}
                        Guardar
                      </Button>
                    </div>

                    <p className="mt-1 font-mono text-[0.6875rem] text-subtle-foreground">{setting.key}</p>
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
    </div>
  )
}
