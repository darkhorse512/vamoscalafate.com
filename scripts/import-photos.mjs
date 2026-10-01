#!/usr/bin/env node
/**
 * Imports real, properly-licensed photographs from Wikimedia Commons.
 *
 *   node scripts/import-photos.mjs [--dry]
 *
 * WHY WIKIMEDIA
 * Commons holds photographs of the ACTUAL places this site sells — the Perito
 * Moreno front, Lago Argentino, Fitz Roy — under Creative Commons licences
 * that permit commercial use. Generic stock photography of "a glacier" would
 * misrepresent what a traveller is buying; these do not.
 *
 * LICENSING
 * CC BY and CC BY-SA require the author and licence to be credited wherever
 * the work appears. Every import records that on the Media row, and the site
 * renders it. Files whose licence cannot be determined are SKIPPED rather
 * than imported on the assumption they are probably fine.
 *
 * Images are downloaded once, stored under STORAGE_LOCAL_DIR and served by
 * Nginx — the site never hot-links to Commons.
 */

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { config } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../packages/db/generated/client/client.ts'

config({ path: path.join(process.cwd(), 'web/.env') })

const DRY = process.argv.includes('--dry')
const UA = 'VamosCalafate/1.0 (https://vamoscalafate.com; contact: info@vamoscalafate.com)'
const STORAGE = process.env.STORAGE_LOCAL_DIR
const PUBLIC_BASE = (process.env.STORAGE_PUBLIC_URL ?? '').replace(/\/$/, '')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

/** Licences that permit commercial reuse. Anything else is skipped. */
const ALLOWED_LICENCE = /^(CC BY(-SA)?( \d\.\d)?|CC0|Public domain|PD)/i

/**
 * Titles that are never a usable landscape photograph.
 *
 * Commons search ranks on text, not subject, so a query for a mountain
 * returns topographic maps and close-ups of birds photographed nearby. An
 * irrelevant image is worse than no image: it misrepresents the product.
 */
const EXCLUDE_TITLE = new RegExp(
  [
    'map', 'mapa', 'topograph', 'diagram', 'chart', 'logo', 'coat of arms',
    'flag', 'seal', 'satellite', 'landsat', 'plan ', 'scheme', 'graph',
    'poster', 'stamp', 'banknote', 'coin', 'signature',
    // Wildlife close-ups: Commons is full of species shots geotagged to the
    // area, which are not pictures of the place.
    '\\bbird', 'passer', 'zonotrichia', 'hymenops', 'phoenicopterus',
    'anatidae', 'specimen', 'museum of', 'herbarium',
  ].join('|'),
  'i',
)

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Searches Commons and returns candidates with usable licences. */
/**
 * `requireAny` is the relevance gate: at least one of these tokens must appear
 * in the file title, which is the only reliable signal Commons gives about
 * subject matter.
 */
/**
 * Works out who to credit.
 *
 * Many older Commons files predate the structured `Artist` field, so it comes
 * back empty even though the work is plainly someone's. Falling straight to
 * "unknown author" would under-credit them, which is the one thing CC BY-SA
 * asks us not to do. Commons' own attribution tooling falls back to the
 * uploader, who for own-work uploads IS the photographer, so we do the same.
 */
function creditFor(meta, info) {
  const candidates = [
    stripHtml(meta.Artist?.value),
    stripHtml(meta.Attribution?.value),
    stripHtml(meta.Credit?.value),
    // A renamed account keeps a "~commonswiki" suffix that is an artefact of
    // the rename, not part of the person's name.
    info.user?.replace(/~\w+$/, ''),
  ]
  for (const candidate of candidates) {
    const value = candidate?.trim()
    if (value) return value
  }
  return 'Autor desconocido'
}

async function search(term, requireAny = [], limit = 12) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
    '&generator=search&gsrnamespace=6&gsrlimit=' + limit +
    '&gsrsearch=' + encodeURIComponent(term) +
    '&prop=imageinfo&iiprop=url|size|mime|user|extmetadata&iiurlwidth=2000'

  const response = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!response.ok) return []

  const data = await response.json()
  const pages = Object.values(data?.query?.pages ?? {})

  return pages
    .map((page) => {
      const info = page.imageinfo?.[0]
      if (!info) return null
      const meta = info.extmetadata ?? {}

      const licence = stripHtml(meta.LicenseShortName?.value)
      const artist = creditFor(meta, info)

      return {
        title: page.title,
        licence,
        artist,
        descriptionUrl: info.descriptionurl,
        url: info.thumburl || info.url,
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
        mime: info.mime,
      }
    })
    .filter((c) => {
      if (!c || !c.url) return false
      // Only real photographs, and only licences that allow commercial use.
      if (!/^image\/(jpeg|png|webp)$/.test(c.mime)) return false
      if (!ALLOWED_LICENCE.test(c.licence)) return false
      if (c.width < 1200) return false

      const title = c.title.replace(/^File:/, '')
      if (EXCLUDE_TITLE.test(title)) return false

      // Subject relevance: the title must mention what we searched for.
      if (requireAny.length > 0) {
        const haystack = title.toLowerCase()
        if (!requireAny.some((token) => haystack.includes(token.toLowerCase()))) return false
      }

      return true
    })
    // Prefer landscape orientation — these fill wide hero and card frames.
    .sort((a, b) => b.width / b.height - a.width / a.height)
}

async function download(candidate) {
  const response = await fetch(candidate.url, { headers: { 'User-Agent': UA } })
  if (!response.ok) throw new Error(`download failed: ${response.status}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength < 20_000) throw new Error('file suspiciously small')

  return buffer
}

async function store(buffer, mime) {
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  const now = new Date()
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${ext}`
  const target = path.join(STORAGE, key)

  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, buffer)

  return { key, url: `${PUBLIC_BASE}/${key}` }
}

/**
 * Imports one image for a search term, skipping anything already imported
 * (matched on the Commons page URL) so the script is safe to re-run.
 */
/**
 * Tries each `[term, requireAny]` attempt until one yields a usable image.
 * Used for heroes, where a single relevant photograph is needed.
 */
async function importFirst(attempts, altText) {
  for (const [term, requireAny] of attempts) {
    const id = await importOne(term, altText, altText, requireAny)
    if (id) return id
  }
  return null
}

async function importOne(term, altText, caption, requireAny = []) {
  const candidates = await search(term, requireAny)
  if (candidates.length === 0) {
    console.log(`  ✗ no usable result for "${term}"`)
    return null
  }

  for (const candidate of candidates) {
    const existing = await prisma.media.findFirst({
      where: { sourceUrl: candidate.descriptionUrl },
      select: { id: true },
    })
    if (existing) return existing.id

    if (DRY) {
      console.log(`  · would import ${candidate.title} (${candidate.licence})`)
      return null
    }

    try {
      const buffer = await download(candidate)
      const { key, url } = await store(buffer, candidate.mime)

      const media = await prisma.media.create({
        data: {
          type: 'IMAGE',
          storageKey: key,
          url,
          filename: candidate.title.replace(/^File:/, '').slice(0, 200),
          mimeType: candidate.mime,
          size: buffer.byteLength,
          width: candidate.width,
          height: candidate.height,
          altText,
          caption,
          license: candidate.licence,
          attributionText: candidate.artist,
          attributionUrl: candidate.descriptionUrl,
          sourceUrl: candidate.descriptionUrl,
        },
        select: { id: true },
      })

      console.log(`  ✓ ${candidate.title.replace(/^File:/, '').slice(0, 52)} — ${candidate.licence}`)
      return media.id
    } catch (error) {
      console.log(`  ! ${candidate.title.slice(0, 40)}: ${error.message}`)
    }
  }

  return null
}

/**
 * Search terms per entity.
 *
 * Each names the REAL place the product visits, so the photograph shows what
 * the traveller will actually see.
 */
const TOUR_PHOTOS = {
  'glaciar-perito-moreno-pasarelas': [
    ['Perito Moreno Glacier walkways', 'Pasarelas frente al Glaciar Perito Moreno'],
    ['Perito Moreno Glacier front', 'Frente del Glaciar Perito Moreno'],
    ['Perito Moreno Glacier calving', 'Desprendimiento de hielo en el Glaciar Perito Moreno'],
  ],
  'minitrekking-perito-moreno': [
    ['Trekking Perito Moreno Glacier', 'Caminata con crampones sobre el Glaciar Perito Moreno'],
    ['Perito Moreno Glacier ice', 'Superficie de hielo del Glaciar Perito Moreno'],
  ],
  'navegacion-todo-glaciares': [
    ['Upsala Glacier', 'Frente del Glaciar Upsala'],
    ['Spegazzini Glacier', 'Glaciar Spegazzini'],
    ['Lago Argentino iceberg', 'Témpanos en el Lago Argentino'],
  ],
  'safari-nautico-perito-moreno': [
    ['Perito Moreno Glacier boat', 'Navegación frente al Glaciar Perito Moreno'],
  ],
  'el-chalten-dia-completo': [
    ['Cerro Fitz Roy', 'Cerro Fitz Roy desde El Chaltén'],
    ['El Chalten village', 'El Chaltén, Santa Cruz'],
    ['Laguna Capri Fitz Roy', 'Laguna Capri, Parque Nacional Los Glaciares'],
  ],
  'balcones-de-calafate-4x4': [
    ['El Calafate Lago Argentino view', 'Vista del Lago Argentino desde El Calafate'],
  ],
  'estancia-patagonica-dia-de-campo': [
    ['Patagonia estancia sheep', 'Estancia patagónica en Santa Cruz'],
  ],
  'city-tour-el-calafate': [
    ['El Calafate town Santa Cruz', 'El Calafate, Santa Cruz', ['calafate']],
    ['Laguna Nimez El Calafate', 'Reserva Natural Laguna Nimez', ['nimez', 'laguna']],
  ],
  'glaciarium-museo-del-hielo': [
    ['Glaciarium El Calafate', 'Glaciarium, centro de interpretación glaciológica'],
  ],
  'kayak-lago-argentino': [
    ['Lago Argentino Patagonia', 'Lago Argentino, Santa Cruz'],
  ],
  'cabalgata-patagonica': [
    ['horses Patagonia Argentina', 'Cabalgata por la estepa patagónica', ['horse', 'caballo', 'gaucho']],
    ['Patagonia landscape steppe', 'Estepa patagónica', ['patagonia', 'steppe']],
  ],
  'traslado-aeropuerto-el-calafate': [
    ['El Calafate airport', 'Aeropuerto Internacional Comandante Armando Tola'],
  ],
  'traslado-el-calafate-el-chalten': [
    ['Ruta 40 Patagonia Santa Cruz', 'Ruta 40 hacia El Chaltén'],
  ],
  'perito-moreno-con-navegacion': [
    ['Perito Moreno Glacier panorama', 'Panorámica del Glaciar Perito Moreno'],
    ['Canal de los Tempanos', 'Canal de los Témpanos'],
  ],
  'trekking-cerro-frias': [
    ['Cerro Frias El Calafate', 'Vista panorámica desde el Cerro Frías', ['frias', 'calafate']],
    ['Patagonia steppe landscape Santa Cruz', 'Estepa patagónica', ['patagonia', 'steppe', 'estepa']],
  ],
}

/**
 * Single-hero entities. Each is `[altText, attempts]`, where an attempt is
 * `[searchTerm, requiredTitleTokens]` and they are tried in order until one
 * passes the relevance filter — a broad fallback beats no image at all.
 */
const DESTINATION_PHOTOS = {
  'el-calafate': [
    'El Calafate, Santa Cruz',
    [
      ['El Calafate town Argentina', ['calafate']],
      ['El Calafate Santa Cruz', ['calafate']],
    ],
  ],
  'glaciar-perito-moreno': [
    'Glaciar Perito Moreno',
    [['Perito Moreno Glacier front', ['perito', 'moreno']]],
  ],
  'parque-nacional-los-glaciares': [
    'Parque Nacional Los Glaciares',
    [
      ['Los Glaciares National Park', ['glaciares', 'glacier']],
      ['Los Glaciares', []],
    ],
  ],
  'el-chalten': [
    'Cerro Fitz Roy y El Chaltén',
    [
      ['Fitz Roy El Chalten', ['fitz', 'chalten']],
      ['Cerro Chalten Patagonia', ['chalten', 'fitz']],
    ],
  ],
  'lago-argentino': [
    'Lago Argentino',
    [['Lago Argentino lake Patagonia', ['argentino']]],
  ],
}

const BLOG_PHOTOS = {
  'que-hacer-en-el-calafate': [
    'El Calafate y el Lago Argentino',
    [
      ['El Calafate Lago Argentino landscape', ['calafate', 'argentino']],
      ['El Calafate panorama', ['calafate']],
    ],
  ],
  'como-visitar-el-glaciar-perito-moreno': [
    'Miradores del Glaciar Perito Moreno',
    [
      ['Perito Moreno Glacier walkway', ['perito', 'moreno']],
      ['Perito Moreno Glacier', ['perito', 'moreno']],
    ],
  ],
  'cuantos-dias-en-el-calafate': [
    'Lago Argentino',
    [
      ['Lago Argentino El Calafate', ['argentino', 'calafate']],
      ['Lago Argentino', ['argentino']],
    ],
  ],
  'mejor-epoca-para-visitar-el-calafate': [
    'Otoño en la Patagonia austral',
    [
      ['Nothofagus lenga forest Patagonia autumn', ['lenga', 'nothofagus']],
      ['Patagonia autumn landscape Santa Cruz', ['patagonia', 'autumn', 'otono']],
      ['Los Glaciares National Park landscape', ['glaciares', 'patagonia']],
    ],
  ],
  'que-ropa-llevar-a-el-calafate': [
    'Trekking en la Patagonia',
    [
      ['trekking Los Glaciares National Park', ['glaciares', 'trekking']],
      ['hiking Patagonia Santa Cruz Argentina', ['patagonia', 'hiking', 'trekking']],
      ['Fitz Roy trekking', ['fitz', 'chalten']],
    ],
  ],
  'el-calafate-en-3-dias': [
    'Glaciar Perito Moreno',
    [['Perito Moreno Glacier panorama', ['perito', 'moreno']]],
  ],
}

async function main() {
  if (!STORAGE || !PUBLIC_BASE) {
    throw new Error('STORAGE_LOCAL_DIR and STORAGE_PUBLIC_URL must be set')
  }

  console.log(DRY ? '\nDRY RUN — nothing will be written\n' : '\nImporting photographs from Wikimedia Commons\n')

  // ── Tours ────────────────────────────────────────────────────────────────
  for (const [slug, photos] of Object.entries(TOUR_PHOTOS)) {
    const tour = await prisma.tour.findUnique({
      where: { slug },
      select: { id: true, name: true, images: { select: { mediaId: true } } },
    })
    if (!tour) continue
    if (tour.images.length > 0) {
      console.log(`→ ${tour.name} (already has images, skipping)`)
      continue
    }

    console.log(`→ ${tour.name}`)
    const mediaIds = []

    for (const [term, alt, requireAny = []] of photos) {
      const id = await importOne(term, alt, alt, requireAny)
      if (id && !mediaIds.includes(id)) mediaIds.push(id)
    }

    if (!DRY && mediaIds.length > 0) {
      await prisma.tourImage.createMany({
        data: mediaIds.map((mediaId, index) => ({
          tourId: tour.id,
          mediaId,
          sortOrder: index,
          isCover: index === 0,
        })),
        skipDuplicates: true,
      })
    }
  }

  // ── Destinations ─────────────────────────────────────────────────────────
  for (const [slug, [alt, attempts]] of Object.entries(DESTINATION_PHOTOS)) {
    const destination = await prisma.destination.findUnique({
      where: { slug },
      select: { id: true, name: true, heroImageId: true },
    })
    if (!destination || destination.heroImageId) continue

    console.log(`→ ${destination.name}`)
    const id = await importFirst(attempts, alt)
    if (!DRY && id) {
      await prisma.destination.update({ where: { id: destination.id }, data: { heroImageId: id } })
    }
  }

  // ── Blog ─────────────────────────────────────────────────────────────────
  for (const [slug, [alt, attempts]] of Object.entries(BLOG_PHOTOS)) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, title: true, heroImageId: true },
    })
    if (!post || post.heroImageId) continue

    console.log(`→ ${post.title.slice(0, 50)}`)
    const id = await importFirst(attempts, alt)
    if (!DRY && id) {
      await prisma.blogPost.update({ where: { id: post.id }, data: { heroImageId: id } })
    }
  }

  const total = await prisma.media.count({ where: { type: 'IMAGE' } })
  console.log(`\nDone. ${total} images in the library.`)
  console.log('Every imported file records its author and licence; the site renders that credit.\n')
}

main()
  .catch((error) => {
    console.error('\nImport failed:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
