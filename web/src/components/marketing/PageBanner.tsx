import { getDestinationHeroes } from '@/server/queries/home'
import { SmartImage } from '@/components/media/SmartImage'
import { PhotoCredit } from '@/components/media/PhotoCredit'

/**
 * Header band for listing and content pages.
 *
 * A real photograph of the region under the brand aurora, so inner pages keep
 * the homepage's atmosphere instead of dropping to a plain grey strip. The
 * image comes from a destination's hero (`imageSlug`) and the component fetches
 * it itself, so pages opt in without threading media through their own data.
 *
 * Without an image — legal pages, deliberately — it renders the aurora alone.
 */
export async function PageBanner({
  imageSlug,
  children,
}: {
  imageSlug?: string
  children: React.ReactNode
}) {
  const media = imageSlug ? ((await getDestinationHeroes())[imageSlug] ?? null) : null

  return (
    <section className="relative isolate overflow-hidden bg-aurora">
      {media ? (
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <SmartImage media={media} seed={`banner-${imageSlug}`} alt="" sizes="100vw" priority quality={75} />
          <div className="absolute inset-0 bg-gradient-to-r from-plum-950/95 via-plum-950/75 to-plum-950/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-plum-950/70 to-transparent" />
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-magenta-500/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page relative py-14 sm:py-20">{children}</div>

      {media ? (
        <PhotoCredit media={media} tone="light" className="absolute bottom-2.5 right-5 text-right" />
      ) : null}
    </section>
  )
}
