import Link from 'next/link'
import type { Metadata } from 'next'
import { ROUTES, formatDate, toDate } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/media/SmartImage'
import { buildMetadata } from '@/lib/seo'
import { getBlogCategories, listBlogPosts } from '@/server/queries/content'
import { cn } from '@/lib/utils'

export const metadata: Metadata = buildMetadata({
  title: 'Guía de viaje a El Calafate',
  description:
    'Artículos prácticos sobre El Calafate: qué hacer, cuántos días quedarse, cómo llegar, mejor época para visitar y cómo organizar tu viaje por la Patagonia.',
  path: ROUTES.blog,
})

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const categorySlug = typeof params.categoria === 'string' ? params.categoria : undefined
  const page = Math.max(1, Number(params.page) || 1)

  const [result, categories] = await Promise.all([
    listBlogPosts({ categorySlug, page, pageSize: 9 }),
    getBlogCategories(),
  ])

  const active = categories.find((c) => c.slug === categorySlug)

  return (
    <>
      <div className="border-b border-border bg-surface-muted">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            items={[
              { name: 'Inicio', path: '/' },
              { name: 'Guía de viaje', path: ROUTES.blog },
              ...(active ? [{ name: active.name, path: `${ROUTES.blog}?categoria=${active.slug}` }] : []),
            ]}
          />
          <SectionHeading
            as="h1"
            eyebrow="Guía de viaje"
            title={active ? active.name : 'Todo lo que conviene saber antes de venir'}
            description={
              active?.description ??
              'Información práctica y verificable sobre El Calafate, el Parque Nacional Los Glaciares y la Patagonia austral.'
            }
            className="mt-5"
          />
        </div>
      </div>

      <div className="container-page py-10 sm:py-12">
        <nav aria-label="Categorías del blog" className="mb-9">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={ROUTES.blog}
                className={cn(
                  'inline-flex rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
                  !categorySlug
                    ? 'border-violet-700 bg-violet-700 text-white'
                    : 'border-border-strong bg-surface text-foreground hover:border-plum-400',
                )}
              >
                Todos
              </Link>
            </li>
            {categories
              .filter((c) => c._count.posts > 0)
              .map((category) => (
                <li key={category.id}>
                  <Link
                    href={`${ROUTES.blog}?categoria=${category.slug}`}
                    className={cn(
                      'inline-flex rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
                      categorySlug === category.slug
                        ? 'border-violet-700 bg-violet-700 text-white'
                        : 'border-border-strong bg-surface text-foreground hover:border-plum-400',
                    )}
                  >
                    {category.name}
                    <span className="ml-1.5 opacity-60">{category._count.posts}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </nav>

        {result.items.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong bg-surface-muted px-6 py-16 text-center text-sm text-muted-foreground">
            Todavía no hay artículos publicados en esta categoría.
          </p>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post, index) => (
              <li key={post.id}>
                <article className="group h-full">
                  <Link href={ROUTES.blogPost(post.slug)} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-surface-strong">
                      <SmartImage
                        media={post.heroImage}
                        seed={post.slug}
                        alt={post.title}
                        sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                        priority={index < 3}
                        className="transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>

                    <div className="mt-4">
                      {post.category ? (
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-violet-700">
                          {post.category.name}
                        </p>
                      ) : null}

                      <h2 className="mt-2 font-display text-[1.0625rem] font-semibold leading-snug text-heading group-hover:text-violet-800">
                        {post.title}
                      </h2>

                      <p className="mt-2 line-clamp-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                        {post.excerpt}
                      </p>

                      <p className="mt-3 text-xs text-plum-500">
                        {post.publishedAt ? (
                          <time dateTime={toDate(post.publishedAt).toISOString()}>
                            {formatDate(post.publishedAt)}
                          </time>
                        ) : null}
                        {' · '}
                        {post.readingTime} min de lectura
                      </p>
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}

        {result.totalPages > 1 ? (
          <nav aria-label="Paginación" className="mt-12 flex justify-center gap-2">
            {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={
                  categorySlug
                    ? `${ROUTES.blog}?categoria=${categorySlug}${p > 1 ? `&page=${p}` : ''}`
                    : `${ROUTES.blog}${p > 1 ? `?page=${p}` : ''}`
                }
                aria-current={p === result.page ? 'page' : undefined}
                className={cn(
                  'grid size-10 place-items-center rounded-control text-sm font-medium',
                  p === result.page
                    ? 'bg-violet-700 text-white'
                    : 'border border-border-strong text-foreground hover:bg-surface-muted',
                )}
              >
                {p}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </>
  )
}
