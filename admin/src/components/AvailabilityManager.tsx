'use client'

import { useMemo, useState, useTransition } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { toISODate, todayUTC } from '@vamos/shared'
import { Alert, Button } from '@/components/ui/primitives'
import { generateAvailabilityAction } from '@/server/actions/tours'

const WEEKDAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

/**
 * Bulk availability generator.
 *
 * Creating departures one by one for a season would be unusable, so this
 * generates a whole date range at once. Existing rows are skipped rather than
 * overwritten, which means regenerating a range never destroys the
 * `seatsBooked` counts of departures that already have passengers.
 */
export function AvailabilityManager({
  tourId: _tourId,
  options,
}: {
  tourId: string
  options: { id: string; name: string; capacity: number }[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  /**
   * Computed once. Reading the clock during render is impure - the default
   * range could shift between renders and silently change what an operator is
   * about to generate.
   */
  const { today, inSixMonths } = useMemo(() => {
    // `todayUTC()` is the shared helper every date in this platform goes
    // through, so the admin's notion of "today" matches the availability
    // rows, which are stored at UTC midnight.
    const start = todayUTC()
    return {
      today: toISODate(start),
      inSixMonths: toISODate(new Date(start.getTime() + 182 * 86_400_000)),
    }
  }, [])

  const [optionId, setOptionId] = useState(options[0]?.id ?? '')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(inSixMonths)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [seatsTotal, setSeatsTotal] = useState(options[0]?.capacity ?? 20)
  const [departureTimes, setDepartureTimes] = useState('')

  if (options.length === 0) {
    return (
      <Alert tone="warning" title="Sin opciones activas">
        Agregá al menos una opción activa para poder generar disponibilidad.
      </Alert>
    )
  }

  function generate() {
    setMessage(null)

    startTransition(async () => {
      const result = await generateAvailabilityAction({
        optionId,
        from,
        to,
        weekdays,
        departureTimes: departureTimes.split(',').map((s) => s.trim()).filter(Boolean),
        seatsTotal: Number(seatsTotal),
      })

      if (!result.ok) {
        setMessage({ tone: 'danger', text: result.message })
        return
      }

      setMessage({
        tone: 'success',
        text:
          result.data.created === 0
            ? 'No se crearon salidas nuevas: ya existían para ese rango.'
            : `${result.data.created} salidas generadas.`,
      })
    })
  }

  return (
    <section className="admin-panel overflow-hidden">
      <h2>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-muted"
        >
          <span className="inline-flex items-center gap-2 text-[0.875rem] font-semibold text-heading">
            <CalendarPlus className="size-4 text-primary" aria-hidden="true" />
            Generar disponibilidad
          </span>
          <span className="text-[0.75rem] text-subtle-foreground">{open ? 'Ocultar' : 'Abrir'}</span>
        </button>
      </h2>

      {open ? (
        <div className="space-y-4 border-t border-border p-4">
          <p className="text-[0.8125rem] text-subtle-foreground">
            Crea las salidas de una opción para un rango de fechas. Las salidas que ya existen se
            respetan: nunca se pierden los lugares ya reservados.
          </p>

          {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="av-option" className="admin-label">
                Opción
              </label>
              <select
                id="av-option"
                value={optionId}
                onChange={(event) => {
                  setOptionId(event.target.value)
                  const option = options.find((o) => o.id === event.target.value)
                  if (option) setSeatsTotal(option.capacity)
                }}
                className="admin-input"
              >
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="av-seats" className="admin-label">
                Lugares por salida
              </label>
              <input
                id="av-seats"
                type="number"
                min={1}
                value={seatsTotal}
                onChange={(event) => setSeatsTotal(Number(event.target.value))}
                className="admin-input"
              />
            </div>

            <div>
              <label htmlFor="av-from" className="admin-label">
                Desde
              </label>
              <input
                id="av-from"
                type="date"
                min={today}
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="admin-input"
              />
            </div>

            <div>
              <label htmlFor="av-to" className="admin-label">
                Hasta
              </label>
              <input
                id="av-to"
                type="date"
                min={from}
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="admin-input"
              />
            </div>
          </div>

          <fieldset>
            <legend className="admin-label">Días de la semana</legend>
            <p className="mb-2 text-[0.75rem] text-subtle-foreground">
              Sin selección = todos los días.
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <label
                  key={day.value}
                  className={`cursor-pointer rounded-control border px-3 py-1.5 text-[0.8125rem] transition-colors ${
                    weekdays.includes(day.value)
                      ? 'border-primary bg-primary-soft text-primary'
                      : 'border-border-strong bg-surface text-foreground hover:bg-surface-muted'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={weekdays.includes(day.value)}
                    onChange={(event) =>
                      setWeekdays(
                        event.target.checked
                          ? [...weekdays, day.value]
                          : weekdays.filter((value) => value !== day.value),
                      )
                    }
                    className="sr-only"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="av-times" className="admin-label">
              Horarios
            </label>
            <input
              id="av-times"
              value={departureTimes}
              onChange={(event) => setDepartureTimes(event.target.value)}
              placeholder="08:00, 14:00 - vacío usa los horarios de la opción"
              className="admin-input"
            />
          </div>

          <Button type="button" onClick={generate} disabled={pending || !optionId}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Generar salidas
          </Button>
        </div>
      ) : null}
    </section>
  )
}
