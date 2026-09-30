'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { Button } from '@/components/ui/Button'

/** Search box. A real form, so it submits on Enter and works unhydrated. */
export function SearchInput({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const term = value.trim()
        if (term.length >= 2) router.push(`${ROUTES.search}?q=${encodeURIComponent(term)}`)
      }}
      className="flex gap-2"
    >
      <div className="relative flex-1">
        <label htmlFor="site-search" className="sr-only">
          Buscar en el sitio
        </label>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-lenga-400"
          aria-hidden="true"
        />
        <input
          id="site-search"
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Perito Moreno, traslado al aeropuerto, qué llevar…"
          autoComplete="off"
          className="h-12 w-full rounded-control border border-stone-300 bg-white pl-10 pr-3 text-sm text-lenga-900 placeholder:text-lenga-400 focus:border-glacier-600 focus:outline-none focus:ring-1 focus:ring-glacier-600"
        />
      </div>
      <Button type="submit" size="lg">
        Buscar
      </Button>
    </form>
  )
}
