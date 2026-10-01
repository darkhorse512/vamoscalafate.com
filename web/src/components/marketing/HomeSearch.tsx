'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Compass, Search } from 'lucide-react'
import { ROUTES, todayUTC } from '@vamos/shared'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { analytics } from '@/lib/analytics'

/**
 * Homepage discovery bar.
 *
 * Submits to the excursion listing as ordinary query parameters rather than
 * filtering in the browser, so results are server-rendered, shareable and
 * indexable. It is a real <form>, so Enter submits and the control works
 * before hydration completes.
 */
export function HomeSearch({ categories }: { categories: { slug: string; name: string }[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')

  const today = todayUTC().toISOString().slice(0, 10)

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category) params.set('categoria', category)
    if (date) params.set('fecha', date)

    if (query.trim()) analytics.search(query.trim())

    router.push(params.toString() ? `${ROUTES.tours}?${params}` : ROUTES.tours)
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label="Buscar experiencias"
      className="rounded-[1.25rem] border border-border bg-surface p-3 shadow-float sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div>
          <label htmlFor="home-q" className="sr-only">
            Qué querés hacer
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2 text-primary"
              aria-hidden="true"
            />
            <input
              id="home-q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Perito Moreno, navegación, traslado…"
              className="form-control pl-10"
            />
          </div>
        </div>

        <div>
          <label htmlFor="home-cat" className="sr-only">
            Categoría
          </label>
          <Select
            id="home-cat"
            value={category}
            onChange={setCategory}
            leadingIcon={<Compass className="size-4" aria-hidden="true" />}
            options={[
              { value: '', label: 'Todas las experiencias' },
              ...categories.map((c) => ({ value: c.slug, label: c.name })),
            ]}
          />
        </div>

        <div>
          <label htmlFor="home-date" className="sr-only">
            Fecha
          </label>
          <DatePicker id="home-date" value={date} onChange={setDate} min={today} placeholder="¿Cuándo viajás?" clearable />
        </div>

        <Button type="submit" size="lg" variant="accent" className="h-12 sm:px-8">
          <Search className="size-4" aria-hidden="true" />
          Buscar
        </Button>
      </div>
    </form>
  )
}
