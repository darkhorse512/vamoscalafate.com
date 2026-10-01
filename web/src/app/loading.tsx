/**
 * Route-level loading state.
 *
 * A skeleton rather than a spinner: it reserves the layout's shape, so content
 * arriving does not shift what is already painted (CLS).
 */
export default function Loading() {
  return (
    <div className="container-page py-12" role="status" aria-label="Cargando contenido">
      <span className="sr-only">Cargando…</span>

      <div className="h-4 w-48 animate-pulse rounded bg-surface-strong" />
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded bg-surface-strong" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-surface-strong" />

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-card border border-border">
            <div className="aspect-[4/3] animate-pulse bg-surface-strong" />
            <div className="space-y-3 p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-surface-strong" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-surface-strong" />
              <div className="h-3 w-full animate-pulse rounded bg-surface-strong" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-surface-strong" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
