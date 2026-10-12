#!/usr/bin/env node
/**
 * Turns a camera or phone video into web renditions and registers it in the
 * media library, so it can be chosen in the admin.
 *
 *   node --experimental-strip-types scripts/prepare-video.mjs <file> [options]
 *     --slug <name>     file name to publish under (default: from the file)
 *     --title <text>    shown in the media library and used as the alt text
 *     --poster <sec>    second to take the poster frame from (default 1)
 *     --max <px>        longest edge (default 1280)
 *     --keep            keep the original file in place (default: it stays)
 *
 * WHY THIS EXISTS
 * Phone footage is HEVC (which Chrome and Firefox will not play), 60fps and
 * tens of megabytes a second. The 79-second sample was 201 MB at 20 Mbps —
 * nobody on a mobile connection in El Calafate would ever see it. This
 * re-encodes to H.264 at a sane bitrate, which every browser plays, and
 * extracts a poster frame so the page shows something instantly and only
 * downloads the video when the visitor presses play.
 *
 * `-movflags +faststart` puts the index at the front of the file, so playback
 * can begin before the whole file has arrived.
 */

import { execFile } from 'node:child_process'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'
import { config } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../packages/db/generated/client/client.ts'

const run = promisify(execFile)
const ROOT = process.cwd()
const require = createRequire(path.join(ROOT, 'web/package.json'))
const sharp = require('sharp')

config({ path: path.join(ROOT, 'web/.env') })
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

/*
 * Renditions go to the media volume that nginx serves at /media/, not to
 * web/public: a 20 MB file there would be committed to git and copied into
 * every release. nginx also answers range requests, which is what lets a
 * viewer seek within the video.
 */
const STORAGE = process.env.STORAGE_LOCAL_DIR
const PUBLIC_BASE = (process.env.STORAGE_PUBLIC_URL ?? '').replace(/\/$/, '')
const VIDEO_DIR = STORAGE ? path.join(STORAGE, 'video') : null

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index > -1 ? process.argv[index + 1] : fallback
}

async function probe(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-show_entries', 'stream=codec_type,width,height',
    '-of', 'json',
    file,
  ])
  const data = JSON.parse(stdout)
  const video = data.streams.find((s) => s.codec_type === 'video')
  const audio = data.streams.find((s) => s.codec_type === 'audio')
  return {
    width: video.width,
    height: video.height,
    duration: Number(data.format.duration),
    hasAudio: Boolean(audio),
  }
}

async function main() {
  const input = process.argv[2]
  if (!input || input.startsWith('--')) {
    console.error('Usage: prepare-video.mjs <file> [--slug name] [--title text] [--poster sec] [--max px]')
    process.exit(1)
  }

  const meta = await probe(input)
  const maxEdge = Number(arg('max', 1280))
  const slug = (arg('slug', path.basename(input, path.extname(input))))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const title = arg('title', slug.replace(/-/g, ' '))
  const posterAt = Math.min(Number(arg('poster', 1)), Math.max(0, meta.duration - 0.5))

  // Scale the long edge down to maxEdge, keeping the aspect ratio, and force
  // even dimensions — H.264 chroma subsampling requires them.
  const portrait = meta.height >= meta.width
  const scale = portrait
    ? `scale=-2:'min(${maxEdge},ih)'`
    : `scale='min(${maxEdge},iw)':-2`

  if (!VIDEO_DIR || !PUBLIC_BASE) throw new Error('STORAGE_LOCAL_DIR and STORAGE_PUBLIC_URL must be set')
  await mkdir(VIDEO_DIR, { recursive: true })
  const mp4Path = path.join(VIDEO_DIR, `${slug}.mp4`)
  const posterPath = path.join(VIDEO_DIR, `${slug}-poster.jpg`)

  console.log(`→ ${path.basename(input)}  ${meta.width}×${meta.height}  ${meta.duration.toFixed(1)}s`)
  console.log('  encoding H.264…')
  await run(
    'ffmpeg',
    [
      '-v', 'error', '-y',
      '-i', input,
      '-vf', `${scale},fps=30`,
      '-c:v', 'libx264',
      '-profile:v', 'high',
      '-preset', 'slow',
      // Constant-quality encoding: 23 is visually clean for travel footage.
      '-crf', '23',
      // A ceiling so a busy shot cannot spike the bitrate on a mobile link.
      '-maxrate', '2500k', '-bufsize', '5000k',
      '-pix_fmt', 'yuv420p',
      ...(meta.hasAudio ? ['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : ['-an']),
      '-movflags', '+faststart',
      mp4Path,
    ],
    { maxBuffer: 1024 * 1024 * 32 },
  )

  console.log('  extracting poster…')
  const posterRaw = path.join(VIDEO_DIR, `${slug}-poster.png`)
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(posterAt), '-i', input, '-frames:v', '1', posterRaw])
  await sharp(posterRaw).resize({ width: portrait ? 720 : 1280 }).jpeg({ quality: 82, progressive: true }).toFile(posterPath)
  await run('rm', ['-f', posterRaw])

  const encoded = await probe(mp4Path)
  const { size } = await stat(mp4Path)
  const url = `${PUBLIC_BASE}/video/${slug}.mp4`
  const posterUrl = `${PUBLIC_BASE}/video/${slug}-poster.jpg`

  /*
   * Registered as media so the admin can pick it like any other asset.
   */
  const existing = await prisma.media.findFirst({ where: { storageKey: `video/${slug}.mp4` }, select: { id: true } })
  const data = {
    type: 'VIDEO',
    storageKey: `video/${slug}.mp4`,
    url,
    filename: `${slug}.mp4`,
    mimeType: 'video/mp4',
    size,
    width: encoded.width,
    height: encoded.height,
    altText: title,
    caption: null,
    // Poster frame, so a player can show something before the video loads.
    externalUrl: posterUrl,
    license: null,
  }
  const media = existing
    ? await prisma.media.update({ where: { id: existing.id }, data, select: { id: true } })
    : await prisma.media.create({ data, select: { id: true } })

  console.log(`\n  ${url}  ${encoded.width}×${encoded.height}  ${(size / 1e6).toFixed(1)} MB`)
  console.log(`  ${posterUrl}`)
  console.log(`  media id: ${media.id}`)
  console.log('\nPick it in the admin (Página de inicio → Video, or a tour\'s video field).')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
