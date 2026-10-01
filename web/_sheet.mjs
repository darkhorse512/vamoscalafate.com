import sharp from 'sharp'
import { readdir, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'
const [root, outDir] = process.argv.slice(2)
await mkdir(outDir, { recursive: true })
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
async function files(dir) {
  const out = []
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name)
    if ((await stat(p)).isDirectory()) out.push(...(await files(p)))
    else if (/\.(jpe?g|png|webp)$/i.test(name)) out.push(p)
  }
  return out.sort()
}
for (const folder of await readdir(root)) {
  const list = await files(path.join(root, folder))
  const W = 300, H = 210, cols = 6, label = 34
  const tiles = []
  const meta = []
  for (const [i, f] of list.entries()) {
    let img, info
    try {
      img = sharp(f).rotate()
      info = await img.metadata()
    } catch { continue }
    const buf = await sharp(f).rotate().resize(W, H, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer()
    const rel = path.relative(path.join(root, folder), f)
    const svg = Buffer.from(`<svg width="${W}" height="${label}"><rect width="100%" height="100%" fill="#200033"/><text x="6" y="14" font-size="12" fill="#fff" font-family="sans-serif">${i + 1}. ${esc(rel.slice(0, 40))}</text><text x="6" y="29" font-size="11" fill="#bfb1ff" font-family="sans-serif">${info.width}×${info.height}</text></svg>`)
    const x = (i % cols) * W, y = Math.floor(i / cols) * (H + label)
    tiles.push({ input: buf, left: x, top: y }, { input: svg, left: x, top: y + H })
    meta.push(`${i + 1}\t${info.width}x${info.height}\t${rel}`)
  }
  const rows = Math.ceil(list.length / cols)
  // Split very tall sheets so each stays legible.
  const perSheet = 4
  for (let s = 0; s * perSheet < rows; s++) {
    const r0 = s * perSheet, r1 = Math.min(rows, r0 + perSheet)
    const part = tiles.filter((t) => t.top >= r0 * (H + label) && t.top < r1 * (H + label)).map((t) => ({ ...t, top: t.top - r0 * (H + label) }))
    await sharp({ create: { width: cols * W, height: (r1 - r0) * (H + label), channels: 3, background: '#ffffff' } })
      .composite(part).jpeg({ quality: 80 }).toFile(path.join(outDir, `${folder.replace(/\s+/g, '_')}-${s + 1}.jpg`))
  }
  await import('node:fs/promises').then((fs) => fs.writeFile(path.join(outDir, `${folder.replace(/\s+/g, '_')}.tsv`), meta.join('\n')))
  console.log(folder, list.length)
}
