#!/usr/bin/env node
/**
 * Generates every brand asset from the master logo, web/public/logo.png.
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * Outputs (for BOTH apps):
 *   public/brand/logo.png               trimmed, for light backgrounds
 *   public/brand/logo-light.png         for dark backgrounds and photos
 *
 * Palette PNG, not WebP: for flat-colour artwork it is the smaller file here
 * (≈35 KB against ≈55 KB) and keeps edges exact.
 *   public/brand/emblem.png             the round emblem alone
 *   public/brand/icon-{192,512}.png     web-manifest icons
 *   src/app/favicon.ico                 16, 32 and 48 px
 *   src/app/icon.png                    512 px, transparent
 *   src/app/apple-icon.png              180 px on white (iOS ignores alpha)
 *
 * The master has ~20% transparent padding on every side; trimming it is
 * what lets the logo sit at a sensible height without looking tiny.
 *
 * The light variant exists because the wordmark is dark navy: on the
 * transparent header over a photograph, the dark footer and dark mode it
 * would disappear. Only the wordmark is recoloured (navy → white, bright
 * blue → a lighter sky blue); the emblem keeps its own colours.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const require = createRequire(path.join(ROOT, 'web/package.json'))
const sharp = require('sharp')

const MASTER = path.join(ROOT, 'web/public/logo.png')
/** Pixels with less alpha than this are anti-aliasing noise for trimming. */
const ALPHA_FLOOR = 24
/** The emblem ends here in the master (measured: first empty column at 624). */
const EMBLEM_RIGHT = 626

/** Exact bounding box of content, ignoring faint halo pixels. */
function bbox(data, width, height, xFrom = 0, xTo = width) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = xFrom; x < xTo; x++) {
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

/** Recolours the wordmark (x ≥ EMBLEM_RIGHT) for dark backgrounds. */
function lighten(data, width, height) {
  const out = Buffer.from(data)
  for (let y = 0; y < height; y++) {
    for (let x = EMBLEM_RIGHT; x < width; x++) {
      const i = (y * width + x) * 4
      if (out[i + 3] === 0) continue
      const [r, g, b] = [out[i], out[i + 1], out[i + 2]]
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      if (luminance < 70) {
        // Navy "Vamos" and the mountain stroke → white.
        out[i] = 255
        out[i + 1] = 255
        out[i + 2] = 255
      } else if (b > 120 && b > r + 60) {
        // Bright blue "Calafate" → sky blue that holds contrast on plum.
        out[i] = Math.min(255, Math.round(r * 0.3 + 110))
        out[i + 1] = Math.min(255, Math.round(g * 0.4 + 140))
        out[i + 2] = 255
      }
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
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
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
  const { data, info } = await sharp(MASTER).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const raw = { raw: { width, height, channels: 4 } }

  const full = bbox(data, width, height)
  const emblemBox = bbox(data, width, height, 0, EMBLEM_RIGHT)
  console.log('logo content', full, 'emblem', emblemBox)

  // Logos at 192 px tall: crisp at 3× for a 64 px rendering, small on disk.
  const LOGO_HEIGHT = 192
  const variants = {
    logo: data,
    'logo-light': lighten(data, width, height),
  }

  const assets = {}
  for (const [name, pixels] of Object.entries(variants)) {
    const base = sharp(pixels, raw).extract(full).resize({ height: LOGO_HEIGHT })
    assets[`brand/${name}.png`] = await base.clone().png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 }).toBuffer()
  }

  // Emblem on a square, transparent canvas with a small margin, so it is not
  // cropped by the round masks some platforms apply.
  const side = Math.max(emblemBox.width, emblemBox.height)
  const margin = Math.round(side * 0.04)
  const emblem = await sharp(data, raw)
    .extract(emblemBox)
    .extend({
      top: Math.floor((side - emblemBox.height) / 2) + margin,
      bottom: Math.ceil((side - emblemBox.height) / 2) + margin,
      left: Math.floor((side - emblemBox.width) / 2) + margin,
      right: Math.ceil((side - emblemBox.width) / 2) + margin,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const square = (size) => sharp(emblem).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 95, effort: 10 }).toBuffer()
  assets['brand/emblem.png'] = await square(512)
  assets['brand/icon-192.png'] = await square(192)
  assets['brand/icon-512.png'] = await square(512)

  const appAssets = {
    'favicon.ico': ico([
      { size: 16, data: await square(16) },
      { size: 32, data: await square(32) },
      { size: 48, data: await square(48) },
    ]),
    'icon.png': await square(512),
    // iOS fills transparency with black, so the touch icon gets a white tile.
    'apple-icon.png': await sharp(emblem)
      .resize(150, 150)
      .extend({ top: 15, bottom: 15, left: 15, right: 15, background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer(),
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

  const meta = await sharp(assets['brand/logo.png']).metadata()
  console.log(`logo ${meta.width}×${meta.height} (aspect ${(meta.width / meta.height).toFixed(4)})`)
  for (const [name, buffer] of Object.entries({ ...assets, ...appAssets })) {
    console.log(`  ${name.padEnd(24)} ${(buffer.length / 1024).toFixed(1)} KB`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
