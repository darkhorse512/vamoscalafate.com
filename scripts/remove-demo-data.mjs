#!/usr/bin/env node
/**
 * Removes the launch demo data.
 *
 *   node --experimental-strip-types scripts/remove-demo-data.mjs [--dry]
 *
 * Deletes every tour, hotel and business flagged isDemo, then any media file
 * the deletion left unused. Media uploaded by a person through the admin
 * (uploadedById set) is never deleted, used or not.
 *
 * Blog articles flagged isDemo are KEPT and unflagged: they are the travel
 * guide itself, flagged only because the business had not reviewed them,
 * not placeholders. Pass --delete-articles to remove them instead.
 */
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { config } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../packages/db/generated/client/client.ts'

config({ path: path.join(process.cwd(), 'web/.env') })
const DRY = process.argv.includes('--dry')
const DELETE_ARTICLES = process.argv.includes('--delete-articles')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
const STORAGE = process.env.STORAGE_LOCAL_DIR

async function main() {
  const demo = {
    tours: await prisma.tour.findMany({ where: { isDemo: true }, select: { id: true, slug: true } }),
    hotels: await prisma.hotel.findMany({ where: { isDemo: true }, select: { id: true, name: true } }),
    businesses: await prisma.business.findMany({ where: { isDemo: true }, select: { id: true, name: true } }),
    posts: await prisma.blogPost.findMany({ where: { isDemo: true }, select: { id: true, slug: true } }),
  }
  console.log('Demo tours:', demo.tours.map((t) => t.slug).join(', ') || 'none')
  console.log('Demo hotels:', demo.hotels.map((h) => h.name).join(', ') || 'none')
  console.log('Demo businesses:', demo.businesses.map((b) => b.name).join(', ') || 'none')
  console.log(`Demo-flagged articles: ${demo.posts.length} (${DELETE_ARTICLES ? 'delete' : 'keep, unflag'})`)

  // A tour with bookings is history, not demo: refuse rather than cascade.
  const booked = await prisma.bookingItem.count({ where: { tourId: { in: demo.tours.map((t) => t.id) } } })
  if (booked > 0) throw new Error(`${booked} booking item(s) reference demo tours; not deleting.`)

  if (DRY) return

  await prisma.$transaction(async (tx) => {
    await tx.tour.deleteMany({ where: { id: { in: demo.tours.map((t) => t.id) } } })
    await tx.hotel.deleteMany({ where: { id: { in: demo.hotels.map((h) => h.id) } } })
    await tx.business.deleteMany({ where: { id: { in: demo.businesses.map((b) => b.id) } } })
    if (DELETE_ARTICLES) await tx.blogPost.deleteMany({ where: { id: { in: demo.posts.map((p) => p.id) } } })
    else await tx.blogPost.updateMany({ where: { isDemo: true }, data: { isDemo: false } })
  })

  // Media nothing uses any more, excluding anything a person uploaded.
  const orphans = await prisma.media.findMany({
    where: {
      uploadedById: null,
      tourImages: { none: {} },
      tourVideos: { none: {} },
      hotelImages: { none: {} },
      hotelVideos: { none: {} },
      businessImages: { none: {} },
      blogHeroFor: { none: {} },
      destinationHeroFor: { none: {} },
      attractionImageFor: { none: {} },
      categoryImageFor: { none: {} },
    },
    select: { id: true, storageKey: true, filename: true },
  })
  // A setting may point at a media id (e.g. site.heroImageId): keep those.
  const settings = await prisma.siteSetting.findMany({ select: { value: true } })
  const referenced = new Set(settings.map((s) => s.value).filter((v) => typeof v === 'string'))
  const removable = orphans.filter((m) => !referenced.has(m.id))

  await prisma.media.deleteMany({ where: { id: { in: removable.map((m) => m.id) } } })
  for (const media of removable) {
    if (STORAGE) await unlink(path.join(STORAGE, media.storageKey)).catch(() => {})
  }
  console.log(`Removed ${removable.length} unused media file(s).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
