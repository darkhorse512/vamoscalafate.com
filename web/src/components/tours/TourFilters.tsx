'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { formatMoney } from '@vamos/shared'
import { Button } from '@/components/ui/Button'
import { buildQuery, cn } from '@/lib/utils'

/**
 * Catalogue filters.
 *
 * Filter state lives entirely in the URL, which makes every filtered view
 * shareable, linkable and back-button-correct. Changing a filter pushes a new
 * URL and the server re-queries - the browser never receives the full
 * catalogue to filter client-side.
 *
 * `useTransition` keeps the current results visible and interactive while the
 * new ones stream in, instead of flashing a spinner.
 */

export type FilterCategory = { slug: string; name: string; count: number }

export function TourFilters({
  basePath,
  categories,
  facets,
  totalResults,
}: {
  basePath: string
  categories: FilterCategory[]
  facets: { minPriceCents: number; maxPriceCents: number }
  totalResults: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [mobileOpen, setMobileOpen] = useState(false)

  const current = {
    categoria: searchParams.get('categoria') ?? '',
    dificultad: searchParams.get('dificultad') ?? '',
    precioMax: searchParams.get('precioMax') ?? '',
    duracionMax: searchParams.get('duracionMax') ?? '',
    fecha: searchParams.get('fecha') ?? '',
    orden: searchParams.get('orden') ?? 'destacados',
  }

  const activeCount = [
    current.categoria,
    current.dificultad,
    current.precioMax,
    current.duracionMax,
    current.fecha,
  ].filter(Boolean).length

  function update(key: string, value: string | null) {
    startTransition(() => {
      router.push(buildQuery(basePath, searchParams, { [key]: value || undefined }), {
        scroll: false,
      })
    })
  }

  function clearAll() {
    startTransition(() => {
      router.push(basePath, { scroll: false })
      setMobileOpen(false)
    })
  }

  const today = new Date().toISOString().slice(0, 10)

  const priceSteps = facets.maxPriceCents
    ? [0.25, 0.5, 0.75, 1].map((f) => Math.round((facets.maxPriceCents * f) / 100000) * 100000)
    : []

  const panel = (
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-3 text-[0.8125rem] font-bold text-heading">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={!current.categoria}
            onClick={() => update('categoria', null)}
            label="Todas"
          />
          {categories.map((category) => (
            <FilterChip
              key={category.slug}
              active={current.categoria === category.slug}
              onClick={() =>
                update('categoria', current.categoria === category.slug ? null : category.slug)
              }
              label={category.name}
              count={category.count}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[0.8125rem] font-bold text-heading">Exigencia física</legend>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'EASY', label: 'Baja' },
            { value: 'MODERATE', label: 'Media' },
            { value: 'CHALLENGING', label: 'Alta' },
          ].map((option) => (
            <FilterChip
              key={option.value}
              active={current.dificultad === option.value}
              onClick={() =>
                update('dificultad', current.dificultad === option.value ? null : option.value)
              }
              label={option.label}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[0.8125rem] font-bold text-heading">Duración</legend>
        <div className="flex flex-wrap gap-2">
          {[
            { value: '240', label: 'Hasta 4 h' },
            { value: '480', label: 'Hasta 8 h' },
            { value: '1440', label: 'Día completo' },
          ].map((option) => (
            <FilterChip
              key={option.value}
              active={current.duracionMax === option.value}
              onClick={() =>
                update('duracionMax', current.duracionMax === option.value ? null : option.value)
              }
              label={option.label}
            />
          ))}
        </div>
      </fieldset>

      {priceSteps.length > 0 ? (
        <fieldset>
          <legend className="mb-3 text-[0.8125rem] font-bold text-heading">Precio máximo</legend>
          <div className="flex flex-wrap gap-2">
            {priceSteps.map((step) => (
              <FilterChip
                key={step}
                active={current.precioMax === String(step)}
                onClick={() =>
                  update('precioMax', current.precioMax === String(step) ? null : String(step))
                }
                label={formatMoney(step, 'ARS')}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      <div>
        <label
          htmlFor="filter-fecha"
          className="mb-2 block text-[0.8125rem] font-bold text-heading"
        >
          Disponible el
        </label>
        <input
          id="filter-fecha"
          type="date"
          min={today}
          value={current.fecha}
          onChange={(event) => update('fecha', event.target.value || null)}
          className="w-full rounded-control border border-border-strong bg-surface px-3 py-2.5 text-sm text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {activeCount > 0 ? (
        <Button variant="outline" size="sm" fullWidth onClick={clearAll}>
          <X className="size-4" aria-hidden="true" />
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  )

  return (
    <>
      {/* Sort + mobile trigger */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={cn('text-sm text-muted-foreground', isPending && 'opacity-55')}
        >
          <strong className="font-semibold text-heading">{totalResults}</strong>{' '}
          {totalResults === 1 ? 'resultado' : 'resultados'}
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor="orden" className="sr-only">
            Ordenar resultados
          </label>
          <select
            id="orden"
            value={current.orden}
            onChange={(event) => update('orden', event.target.value)}
            className="h-10 rounded-control border border-border-strong bg-surface px-3 text-[0.8125rem] font-medium text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="destacados">Destacados</option>
            <option value="precio-asc">Menor precio</option>
            <option value="precio-desc">Mayor precio</option>
            <option value="duracion-asc">Menor duración</option>
            <option value="nombre-asc">Nombre (A–Z)</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
            aria-expanded={mobileOpen}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtros
            {activeCount > 0 ? (
              <span className="ml-0.5 grid size-5 place-items-center rounded-full bg-violet-700 text-[0.625rem] font-bold text-white">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        aria-label="Filtros de búsqueda"
        className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
      >
        {panel}
      </aside>

      {/* Mobile sheet */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-plum-950/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-surface p-5 pb-8"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Filtros</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar filtros"
                className="grid size-9 place-items-center rounded-control text-muted-foreground hover:bg-surface-strong"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            {panel}

            <Button fullWidth className="mt-6" onClick={() => setMobileOpen(false)}>
              Ver {totalResults} {totalResults === 1 ? 'resultado' : 'resultados'}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8125rem] font-medium transition-colors',
        active
          ? 'border-violet-700 bg-violet-700 text-white'
          : 'border-border-strong bg-surface text-foreground hover:border-primary hover:bg-surface-muted',
      )}
    >
      {label}
      {count !== undefined ? (
        <span className={cn('text-xs', active ? 'text-white/70' : 'text-subtle-foreground')}>{count}</span>
      ) : null}
    </button>
  )
}
