import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Table primitive shared by every list screen.
 *
 * Renders a real <table> with scope'd headers and a caption, so screen readers
 * can navigate it by row and column. Row links are plain anchors, which keeps
 * middle-click and "open in new tab" working - a detail that matters a lot to
 * someone working through a queue of bookings.
 */

export type Column<T> = {
  key: string
  header: string
  /** Rendered per row. */
  cell: (row: T) => ReactNode
  className?: string
  /** Right-align numeric columns. */
  numeric?: boolean
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowHref,
  caption,
  emptyMessage = 'No hay registros para mostrar.',
}: {
  columns: Column<T>[]
  rows: T[]
  /** When provided, the first cell becomes a link to the detail view. */
  rowHref?: (row: T) => string
  caption: string
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return (
      <div className="admin-panel px-6 py-12 text-center">
        <p className="text-[0.8125rem] text-subtle-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="admin-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="admin-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(column.numeric && 'text-right', column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column, index) => {
                  const content = column.cell(row)
                  return (
                    <td
                      key={column.key}
                      className={cn(
                        column.numeric && 'tabular text-right',
                        column.className,
                      )}
                    >
                      {index === 0 && rowHref ? (
                        <Link
                          href={rowHref(row)}
                          className="font-medium text-primary hover:text-primary-hover hover:underline"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Pagination as links, so a page can be opened in a new tab. */
export function Pagination({
  basePath,
  page,
  totalPages,
  searchParams,
}: {
  basePath: string
  page: number
  totalPages: number
  searchParams: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null

  const href = (target: number) => {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter((e): e is [string, string] => Boolean(e[1])),
    )
    if (target > 1) params.set('page', String(target))
    else params.delete('page')
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-3">
      <p className="text-[0.75rem] text-subtle-foreground">
        Página {page} de {totalPages}
      </p>

      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            rel="prev"
            className="rounded-control border border-border-strong bg-surface px-3 py-1.5 text-[0.8125rem] font-medium text-foreground hover:bg-surface-muted"
          >
            Anterior
          </Link>
        ) : null}

        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            rel="next"
            className="rounded-control border border-border-strong bg-surface px-3 py-1.5 text-[0.8125rem] font-medium text-foreground hover:bg-surface-muted"
          >
            Siguiente
          </Link>
        ) : null}
      </div>
    </nav>
  )
}
