import Link from 'next/link'
import { ArrowUpRight, Clock } from 'lucide-react'
import { ROUTES, formatDate } from '@vamos/shared'
import type { BlogPostCard } from '@vamos/types'
import { Carousel } from '@/components/ui/Carousel'
import { SmartImage } from '@/components/media/SmartImage'

/**
 * Travel-guide articles as tall editorial cards — magazine covers rather
 * than a list of links, with the headline set over the photograph.
 */
export function StoryCarousel({ posts }: { posts: BlogPostCard[] }) {
  if (posts.length === 0) return null

  return (
    <Carousel ariaLabel="Artículos de la guía de viaje" slideClass="basis-[82%] sm:basis-[47%] lg:basis-[31.5%]">
      {posts.map((post) => (
        <article key={post.id} className="group relative w-full">
          <Link
            href={ROUTES.blogPost(post.slug)}
            className="relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[1.25rem] bg-inverse focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <SmartImage
              media={post.heroImage}
              seed={post.slug}
              alt=""
              sizes="(max-width: 639px) 82vw, (max-width: 1023px) 47vw, 31vw"
              className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-plum-950/95 via-plum-950/35 to-transparent" />

            {post.category ? (
              <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
                {post.category.name}
              </span>
            ) : null}

            <div className="relative p-5 sm:p-6">
              <h3 className="font-display text-xl font-semibold leading-snug text-white sm:text-[1.375rem]">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-white/75">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-4 text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {post.readingTime} min
                  {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ''}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  Leer
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </Carousel>
  )
}
