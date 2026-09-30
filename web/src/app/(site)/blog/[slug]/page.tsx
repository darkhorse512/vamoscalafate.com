import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ROUTES, formatDate, toDate } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { FaqList } from '@/components/content/FaqList'
import { Markdown } from '@/components/content/Markdown'
import { SmartImage } from '@/components/media/SmartImage'
import { TourCarousel } from '@/components/tours/TourCarousel'
import { articleSchema, breadcrumbSchema, faqSchema, jsonLdScript } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { getBlogPostBySlug, getBlogSlugs } from '@/server/queries/content'
import { listTours } from '@/server/queries/tours'

export async function generateStaticParams() {
  const posts = await getBlogSlugs()
  return posts.map((p) => ({ slug: p.slug }))
}

export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) return { title: 'Artículo no encontrado' }

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: ROUTES.blogPost(post.slug),
    imageUrl: post.heroImage?.url ?? null,
    imageAlt: post.heroImage?.altText ?? post.title,
    seo: post.seo,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) notFound()

  const path = ROUTES.blogPost(post.slug)

  const crumbs = [
    { name: 'Inicio', path: '/' },
    { name: 'Guía de viaje', path: ROUTES.blog },
    ...(post.category
      ? [{ name: post.category.name, path: `${ROUTES.blog}?categoria=${post.category.slug}` }]
      : []),
    { name: post.title, path },
  ]

  const schemas = [articleSchema(post, path), breadcrumbSchema(crumbs)]
  const faqs = post.faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))
  const faqLd = faqSchema(faqs)
  if (faqLd) schemas.push(faqLd)
  const ld = jsonLdScript(schemas)

  /**
   * Contextual tours for this article. Linking editorial to the destination's
   * products is the core of the internal-linking model in spec §35 - a guide
   * about the Perito Moreno should reach the excursions that go there.
   */
  const relatedTours = post.destination
    ? await listTours({ destinationSlug: post.destination.slug, pageSize: 3 })
    : await listTours({ pageSize: 3 })

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <article>
        <header className="container-page pt-6">
          <Breadcrumbs items={crumbs} />

          <div className="mx-auto mt-6 max-w-[68ch]">
            {post.category ? (
              <Link
                href={`${ROUTES.blog}?categoria=${post.category.slug}`}
                className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-glacier-700 hover:text-glacier-900"
              >
                {post.category.name}
              </Link>
            ) : null}

            <h1 className="mt-3 font-display text-display-md font-bold leading-[1.1] text-lenga-950">
              {post.title}
            </h1>

            <p className="mt-4 text-lg leading-relaxed text-lenga-600">{post.excerpt}</p>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-200 pt-5 text-[0.8125rem] text-lenga-500">
              {post.author ? <span>Por {post.author.name}</span> : null}
              {post.publishedAt ? (
                <>
                  {post.author ? <span aria-hidden="true">·</span> : null}
                  <time dateTime={toDate(post.publishedAt).toISOString()}>
                    {formatDate(post.publishedAt)}
                  </time>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>{post.readingTime} min de lectura</span>
            </div>
          </div>
        </header>

        {/* Hero image sits after the title so the LCP element is text. */}
        <div className="container-page mt-8">
          <div className="relative mx-auto aspect-[16/9] max-w-4xl overflow-hidden rounded-card bg-stone-100">
            <SmartImage
              media={post.heroImage}
              seed={post.slug}
              alt={post.title}
              sizes="(max-width: 1023px) 100vw, 896px"
              priority
            />
          </div>
        </div>

        <div className="container-prose mt-10">
          <Markdown content={post.content} />

          {post.tags.length > 0 ? (
            <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-lenga-500">
                Temas
              </span>
              {post.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-lenga-700"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}

          {faqs.length > 0 ? (
            <section className="mt-12">
              <h2 className="font-display text-2xl font-semibold text-lenga-950">
                Preguntas frecuentes
              </h2>
              <FaqList faqs={faqs} className="mt-5" />
            </section>
          ) : null}

          {post.destination ? (
            <aside className="mt-12 rounded-card border border-stone-200 bg-stone-50 p-6">
              <h2 className="font-display text-lg font-semibold text-lenga-950">
                Guía completa: {post.destination.name}
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-lenga-600">
                Cómo llegar, qué esperar y qué se puede hacer allí.
              </p>
              <Link
                href={ROUTES.destination(post.destination.slug)}
                className="mt-3 inline-block text-sm font-semibold text-glacier-700 underline underline-offset-2"
              >
                Ver la guía de {post.destination.name}
              </Link>
            </aside>
          ) : null}
        </div>

        {relatedTours.items.length > 0 ? (
          <section className="container-page mt-16 border-t border-stone-200 pt-12">
            <h2 className="font-display text-xl font-semibold text-lenga-950">
              Experiencias relacionadas
            </h2>
            <p className="mt-2 text-sm text-lenga-600">
              Reservá online las excursiones mencionadas en esta guía.
            </p>
            <div className="mt-6">
              <TourCarousel tours={relatedTours.items} ariaLabel="Experiencias relacionadas" />
            </div>
          </section>
        ) : null}
      </article>
    </>
  )
}
