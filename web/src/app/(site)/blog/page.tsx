import Link from 'next/link'
import type { Metadata } from 'next'
import { ROUTES, formatDate, toDate } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/media/SmartImage'
import { buildMetadata } from '@/lib/seo'
import { getBlogCategories, listBlogPosts } from '@/server/queries/content'
import { cn } from '@/lib/utils'
import { PageBanner } from '@/components/marketing/PageBanner'

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
      <PageBanner imageSlug="el-chalten">
        <Breadcrumbs
          tone="light"
          items={[
            { name: 'Inicio', path: '/' },
            { name: 'Guía de viaje', path: ROUTES.blog },
            ...(active
              ? [{ name: active.name, path: `${ROUTES.blog}?categoria=${active.slug}` }]
              : []),
          ]}
        />
        <SectionHeading
          tone="light"
          as="h1"
          eyebrow="Guía de viaje"
          title={active ? active.name : 'Todo lo que conviene saber antes de venir'}
          description={
            active?.description ??
            'Información práctica y verificable sobre El Calafate, el Parque Nacional Los Glaciares y la Patagonia austral.'
          }
          className="mt-5"
        />
      </PageBanner>

      <div className="container-page py-10 sm:py-12">
        <nav aria-label="Categorías del blog" className="mb-9">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={ROUTES.blog}
                className={cn(
                  'inline-flex rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
                  !categorySlug
                    ? 'to-magenta-500 border-transparent bg-gradient-to-r from-violet-600 text-white shadow-[0_6px_16px_rgb(108_88_254/0.28)]'
                    : 'border-border-strong bg-surface text-foreground hover:border-primary',
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
                        ? 'to-magenta-500 border-transparent bg-gradient-to-r from-violet-600 text-white shadow-[0_6px_16px_rgb(108_88_254/0.28)]'
                        : 'border-border-strong bg-surface text-foreground hover:border-primary',
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
          <p className="rounded-card border-border-strong bg-surface-muted text-muted-foreground border border-dashed px-6 py-16 text-center text-sm">
            Todavía no hay artículos publicados en esta categoría.
          </p>
        ) : (
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post, index) => {
              // The newest article leads, at double width, on the unfiltered first view.
              const lead = index === 0 && !categorySlug
              return (
                <li key={post.id} className={cn(lead && 'sm:col-span-2')}>
                  <article className="group h-full">
                    <Link href={ROUTES.blogPost(post.slug)} className="block">
                      <div
                        className={cn(
                          'bg-surface-strong shadow-subtle group-hover:shadow-raised relative overflow-hidden rounded-[1.25rem] transition-shadow duration-300',
                          lead ? 'aspect-[16/10] lg:aspect-[16/9]' : 'aspect-[16/10]',
                        )}
                      >
                        <SmartImage
                          media={post.heroImage}
                          seed={post.slug}
                          alt={post.title}
                          sizes={
                            lead
                              ? '(max-width: 639px) 92vw, 62vw'
                              : '(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw'
                          }
                          priority={index < 3}
                          className="transition-transform duration-700 group-hover:scale-[1.05]"
                        />
                        {lead ? (
                          <span className="from-magenta-500 to-magenta-600 shadow-accent absolute top-4 left-4 rounded-full bg-gradient-to-r px-3 py-1 text-[0.6875rem] font-bold tracking-wide text-white uppercase">
                            Lo último
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4">
                        {post.category ? (
                          <p className="text-primary text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">
                            {post.category.name}
                          </p>
                        ) : null}

                        <h2
                          className={cn(
                            'font-display text-heading group-hover:text-primary mt-2 leading-snug font-semibold transition-colors',
                            lead ? 'text-[1.5rem] sm:text-[1.75rem]' : 'text-[1.0625rem]',
                          )}
                        >
                          {post.title}
                        </h2>

                        <p className="text-muted-foreground mt-2 line-clamp-3 text-[0.8125rem] leading-relaxed">
                          {post.excerpt}
                        </p>

                        <p className="text-muted-foreground mt-3 text-xs">
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
              )
            })}
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
                  'rounded-control grid size-10 place-items-center text-sm font-medium',
                  p === result.page
                    ? 'bg-violet-700 text-white'
                    : 'border-border-strong text-foreground hover:bg-surface-muted border',
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
