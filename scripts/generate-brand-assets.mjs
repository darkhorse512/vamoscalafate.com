#!/usr/bin/env node
/**
 * Generates every brand asset from the master logo, web/public/logo.png.
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * The master is a square, stacked lockup on an opaque white background:
 * a mountain emblem above the words VAMOS / CALAFATE.
 *
 * TRANSPARENCY
 * White is also a DESIGN colour here — the snow and ice swirls inside the
 * mountain are white. Keying out every white pixel would punch holes through
 * the emblem, which only looks right on a white page. So the background is
 * removed by flood-filling inwards from the edges: connected outer white
 * becomes transparent, enclosed white stays.
 *
 * LAYOUT
 * A stacked lockup cannot be read in a 64px header — the word CALAFATE would
 * be about 10px tall. So a horizontal lockup is composed for the header
 * (emblem left, words stacked right), and the original stacked lockup is kept
 * for the footer, the login screen and anywhere with vertical room.
 *
 * DARK VARIANTS
 * The word VAMOS is dark navy, invisible on a photograph or a dark band, so
 * a light variant recolours the dark ink to white and leaves the emblem and
 * the pale blue CALAFATE alone.
 *
 * Outputs, for BOTH apps:
 *   public/brand/logo.png            horizontal, for light surfaces
 *   public/brand/logo-light.png      horizontal, for dark surfaces
 *   public/brand/logo-stacked.png    stacked, for light surfaces
 *   public/brand/logo-stacked-light.png
 *   public/brand/emblem.png          the mountain alone
 *   public/brand/icon-{192,512}.png  web-manifest icons
 *   src/app/favicon.ico              16, 32 and 48 px
 *   src/app/icon.png                 512 px, transparent
 *   src/app/apple-icon.png           180 px on white (iOS ignores alpha)
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const require = createRequire(path.join(ROOT, 'web/package.json'))
const sharp = require('sharp')

const MASTER = path.join(ROOT, 'web/public/logo.png')
/** The logo's own colours, sampled from the master. */
const BRAND_NAVY = '#005878'
/**
 * The accent, used for the icon tile and the share image.
 *
 * The brand is navy, and so is most of the travel industry's branding. The one
 * place that matters commercially is a list of search results, where a row of
 * blue favicons is indistinguishable: the icon is therefore the brand's orange
 * accent, which is the same colour as every booking button on the site, so the
 * mark a visitor clicks in Google is the colour they then see on the page.
 */
const BRAND_ORANGE = '#d2420a'

/** Anything brighter than this on every channel counts as background white. */
const WHITE = 242
/** Alpha below this is anti-aliasing noise when measuring bounds. */
const ALPHA_FLOOR = 24

/**
 * Clears the background: a flood fill from every edge pixel, so only white
 * connected to the outside is removed. Returns RGBA pixels.
 */
function clearBackground(data, width, height) {
  const out = Buffer.from(data)
  const isWhite = (i) => out[i] >= WHITE && out[i + 1] >= WHITE && out[i + 2] >= WHITE
  const seen = new Uint8Array(width * height)
  // A plain array used as a stack: the fill is shallow and wide, and an
  // explicit stack avoids recursion limits on a 1280×1280 image.
  const stack = []

  for (let x = 0; x < width; x++) {
    stack.push(x, (height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    stack.push(y * width, y * width + width - 1)
  }

  while (stack.length > 0) {
    const pixel = stack.pop()
    if (seen[pixel]) continue
    seen[pixel] = 1
    const i = pixel * 4
    if (!isWhite(i)) continue
    out[i + 3] = 0

    const x = pixel % width
    const y = (pixel - x) / width
    if (x > 0) stack.push(pixel - 1)
    if (x < width - 1) stack.push(pixel + 1)
    if (y > 0) stack.push(pixel - width)
    if (y < height - 1) stack.push(pixel + width)
  }

  /*
   * Feather the cut edge. The master is anti-aliased against white, so the
   * ring of near-white pixels just inside the shape would otherwise read as a
   * pale halo on a dark background.
   */
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue
    const luminance = (out[i] + out[i + 1] + out[i + 2]) / 3
    if (luminance > WHITE) continue
    // Pixels close to white are partially background; scale their alpha down.
    if (luminance > 200) out[i + 3] = Math.round(255 * ((WHITE - luminance) / (WHITE - 200)))
  }

  return out
}

/** Bounding box of visible pixels within an optional row band. */
function bbox(data, width, height, yFrom = 0, yTo = height) {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = yFrom; y < yTo; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_FLOOR) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

/**
 * Rows with no ink INSIDE the lockup, used to split emblem / VAMOS /
 * CALAFATE. Bounded by the content box, or the outer margin would count as
 * the first gap.
 */
function emptyRowRuns(data, width, height, from, to) {
  const runs = []
  let start = null
  for (let y = from; y <= to; y++) {
    let ink = false
    for (let x = 0; x < width && !ink; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA_FLOOR) ink = true
    }
    if (!ink) {
      if (start === null) start = y
    } else if (start !== null) {
      runs.push([start, y - 1])
      start = null
    }
  }
  return runs.filter(([a, b]) => b - a > 3)
}

/** Recolours dark ink to white, for use on dark backgrounds. */
function lighten(data) {
  const out = Buffer.from(data)
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue
    const luminance = 0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2]
    if (luminance < 120) {
      out[i] = 255
      out[i + 1] = 255
      out[i + 2] = 255
    }
  }
  return out
}

/** Minimal ICO writer: a directory of embedded PNGs (supported since Vista). */
function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const entries = []
  let offset = 6 + 16 * pngs.length
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    entries.push(entry)
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

async function main() {
  const source = await sharp(MASTER).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = source.info
  const pixels = clearBackground(source.data, width, height)
  const raw = { raw: { width, height, channels: 4 } }

  const stacked = bbox(pixels, width, height)
  const gaps = emptyRowRuns(pixels, width, height, stacked.top, stacked.top + stacked.height - 1)
  if (gaps.length < 2) throw new Error(`Expected two gaps between emblem/VAMOS/CALAFATE, found ${gaps.length}`)
  const [emblemGap, wordGap] = gaps

  const emblem = bbox(pixels, width, height, 0, emblemGap[0])
  const vamos = bbox(pixels, width, height, emblemGap[1], wordGap[0])
  const calafate = bbox(pixels, width, height, wordGap[1], height)
  console.log({ emblem, vamos, calafate })

  const variants = { '': pixels, '-light': lighten(pixels) }
  const assets = {}

  for (const [suffix, data] of Object.entries(variants)) {
    // ── Stacked ────────────────────────────────────────────────────────────
    assets[`brand/logo-stacked${suffix}.png`] = await sharp(data, raw)
      .extract(stacked)
      .resize({ height: 320 })
      .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 })
      .toBuffer()

    /*
     * ── Horizontal ───────────────────────────────────────────────────────
     * The emblem is set to the full lockup height and the two words are
     * stacked beside it, scaled together so their relative sizes are
     * preserved, and optically centred on the emblem.
     */
    const H = 240
    const emblemScaled = Math.round((emblem.width / emblem.height) * H)
    const gapX = Math.round(H * 0.14)

    // Words keep their proportions: scale both by the same factor.
    const wordsWidth = Math.max(vamos.width, calafate.width)
    const wordsHeight = calafate.top + calafate.height - vamos.top
    const scale = (H * 0.62) / wordsHeight
    const vamosW = Math.round(vamos.width * scale)
    const vamosH = Math.round(vamos.height * scale)
    const calafateW = Math.round(calafate.width * scale)
    const calafateH = Math.round(calafate.height * scale)
    const wordGapY = Math.round((calafate.top - (vamos.top + vamos.height)) * scale)
    const blockH = vamosH + wordGapY + calafateH
    const blockTop = Math.round((H - blockH) / 2)
    const blockLeft = emblemScaled + gapX

    const vamosBuf = await sharp(data, raw).extract(vamos).resize(vamosW, vamosH).png().toBuffer()
    const calafateBuf = await sharp(data, raw).extract(calafate).resize(calafateW, calafateH).png().toBuffer()
    const emblemBuf = await sharp(data, raw).extract(emblem).resize(emblemScaled, H).png().toBuffer()

    assets[`brand/logo${suffix}.png`] = await sharp({
      create: {
        width: blockLeft + Math.round(wordsWidth * scale),
        height: H,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        { input: emblemBuf, left: 0, top: 0 },
        // The words are left-aligned with each other, as in the master.
        { input: vamosBuf, left: blockLeft, top: blockTop },
        { input: calafateBuf, left: blockLeft, top: blockTop + vamosH + wordGapY },
      ])
      .png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 })
      .toBuffer()
  }

  /*
   * ── Emblem on a square canvas, for icons ──────────────────────────────
   * The emblem is a wide, flat mountain (about 2.1:1), so on a bare square
   * it shrinks to a sliver: at 16px in a browser tab it would be unreadable.
   * Icons therefore sit on a rounded tile with the mountain filling most of
   * the width, which reads as a solid mark at any size.
   */
  const TILE = 512
  const MARK_WIDTH = Math.round(TILE * 0.78)
  const markHeight = Math.round((emblem.height / emblem.width) * MARK_WIDTH)
  const mark = await sharp(pixels, raw).extract(emblem).resize(MARK_WIDTH, markHeight).png().toBuffer()

  const tile = Buffer.from(
    `<svg width="${TILE}" height="${TILE}"><rect width="${TILE}" height="${TILE}" rx="${Math.round(TILE * 0.22)}" fill="${BRAND_ORANGE}"/></svg>`,
  )
  const emblemSquare = await sharp(tile)
    .composite([{ input: mark, left: Math.round((TILE - MARK_WIDTH) / 2), top: Math.round((TILE - markHeight) / 2) }])
    .png()
    .toBuffer()

  // The bare mountain, transparent, for places that supply their own ground.
  const emblemBare = await sharp(pixels, raw).extract(emblem).resize({ width: 512 }).png().toBuffer()

  const square = (size) =>
    sharp(emblemSquare).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 }).toBuffer()

  assets['brand/emblem.png'] = emblemBare
  assets['brand/icon-tile.png'] = await square(512)
  assets['brand/icon-192.png'] = await square(192)
  assets['brand/icon-512.png'] = await square(512)

  /*
   * ── Share image (Open Graph / Twitter) ────────────────────────────────
   * 1200×630 is what every platform crops from. It is generated rather than
   * photographed because it has to carry the name at thumbnail size, where a
   * landscape photo becomes an unreadable smear - and because a share card
   * that changes with the brand should be regenerated with the brand.
   */
  const OG_W = 1200
  const OG_H = 630
  const ogLogoWidth = 620
  const ogLogo = await sharp(assets['brand/logo-light.png']).resize({ width: ogLogoWidth }).toBuffer()
  const ogLogoMeta = await sharp(ogLogo).metadata()

  const ogBackground = Buffer.from(
    `<svg width="${OG_W}" height="${OG_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff5a1f"/>
          <stop offset="55%" stop-color="${BRAND_ORANGE}"/>
          <stop offset="100%" stop-color="#96380f"/>
        </linearGradient>
      </defs>
      <rect width="${OG_W}" height="${OG_H}" fill="url(#g)"/>
      <text x="${OG_W / 2}" y="${OG_H - 92}" text-anchor="middle"
            font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="600"
            letter-spacing="1.5" fill="#ffffff" fill-opacity="0.92">
        Excursiones en El Calafate · Patagonia Argentina
      </text>
    </svg>`,
  )

  const ogImage = await sharp(ogBackground)
    .composite([
      {
        input: ogLogo,
        left: Math.round((OG_W - ogLogoWidth) / 2),
        top: Math.round((OG_H - (ogLogoMeta.height ?? 0)) / 2) - 36,
      },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()

  assets['og/vamos-calafate.jpg'] = ogImage

  const appAssets = {
    'favicon.ico': ico([
      { size: 16, data: await square(16) },
      { size: 32, data: await square(32) },
      { size: 48, data: await square(48) },
    ]),
    'icon.png': await square(512),
    // iOS ignores transparency and rounds the corners itself, so the touch
    // icon is the flattened tile, square and edge to edge.
    'apple-icon.png': await sharp(emblemSquare).resize(180, 180).flatten({ background: BRAND_ORANGE }).png().toBuffer(),
  }

  for (const app of ['web', 'admin']) {
    for (const [name, buffer] of Object.entries(assets)) {
      const target = path.join(ROOT, app, 'public', name)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, buffer)
    }
    for (const [name, buffer] of Object.entries(appAssets)) {
      await writeFile(path.join(ROOT, app, 'src/app', name), buffer)
    }
  }

  for (const [name, buffer] of Object.entries({ ...assets, ...appAssets })) {
    const meta = name.endsWith('.png') ? await sharp(buffer).metadata() : null
    const size = meta ? `${meta.width}×${meta.height}` : ''
    console.log(`  ${name.padEnd(28)} ${size.padEnd(10)} ${(buffer.length / 1024).toFixed(1)} KB`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
