'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { ROUTES, todayUTC } from '@vamos/shared'
import { Button } from '@/components/ui/Button'
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
      className="rounded-card border border-stone-200 bg-white p-3 shadow-float sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div>
          <label htmlFor="home-q" className="sr-only">
            Qué querés hacer
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-lenga-400"
              aria-hidden="true"
            />
            <input
              id="home-q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Perito Moreno, navegación, traslado…"
              className="h-11 w-full rounded-control border border-stone-300 bg-white pl-9 pr-3 text-sm text-lenga-900 placeholder:text-lenga-400 focus:border-glacier-600 focus:outline-none focus:ring-1 focus:ring-glacier-600"
            />
          </div>
        </div>

        <div>
          <label htmlFor="home-cat" className="sr-only">
            Categoría
          </label>
          <select
            id="home-cat"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 w-full rounded-control border border-stone-300 bg-white px-3 text-sm text-lenga-900 focus:border-glacier-600 focus:outline-none focus:ring-1 focus:ring-glacier-600"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="home-date" className="sr-only">
            Fecha
          </label>
          <input
            id="home-date"
            type="date"
            min={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-11 w-full rounded-control border border-stone-300 bg-white px-3 text-sm text-lenga-900 focus:border-glacier-600 focus:outline-none focus:ring-1 focus:ring-glacier-600"
          />
        </div>

        <Button type="submit" size="md" className="h-11 sm:px-7">
          Buscar
        </Button>
      </div>
    </form>
  )
}
