import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Crumb = { name: string; path: string }

/**
 * Breadcrumb trail.
 *
 * Paired with BreadcrumbList JSON-LD on every detail page, which is what lets
 * Google render the hierarchy in place of a bare URL in search results.
 * The current page is marked with aria-current and is not a link.
 */
export function Breadcrumbs({
  items,
  tone = 'dark',
  className,
}: {
  items: Crumb[]
  tone?: 'dark' | 'light'
  className?: string
}) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Ruta de navegación" className={className}>
      <ol
        className={cn(
          'flex flex-wrap items-center gap-x-1 gap-y-1 text-[0.8125rem]',
          tone === 'light' ? 'text-white/70' : 'text-lenga-500',
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={item.path} className="flex items-center gap-1">
              {index > 0 ? (
                <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
              ) : null}

              {isLast ? (
                <span
                  aria-current="page"
                  className={cn('font-medium', tone === 'light' ? 'text-white' : 'text-lenga-800')}
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className={cn(
                    'transition-colors',
                    tone === 'light' ? 'hover:text-white' : 'hover:text-glacier-700',
                  )}
                >
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
