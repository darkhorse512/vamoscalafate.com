import { chromium, devices } from '@playwright/test'
const BASE = 'http://localhost:3000'
const PAGES = ['/', '/excursiones', '/excursiones/minitrekking-perito-moreno', '/traslados', '/destinos',
  '/destinos/el-chalten', '/blog', '/blog/que-hacer-en-el-calafate', '/hoteles', '/restaurantes', '/servicios',
  '/contacto', '/preguntas-frecuentes', '/creditos-fotograficos', '/terminos', '/buscar?q=glaciar']
const b = await chromium.launch()
const linkStatus = new Map()
const problems = []
for (const [label, opts] of [['desktop', { viewport: { width: 1366, height: 900 } }], ['mobile', devices['Pixel 7']]]) {
  const ctx = await b.newContext({ ...opts, reducedMotion: 'reduce' })
  for (const path of PAGES) {
    const p = await ctx.newPage()
    const errors = []
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)) })
    p.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 140)))
    const res = await p.goto(BASE + path, { waitUntil: 'networkidle' })
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) } })
    await p.waitForTimeout(600)
    const r = await p.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src.slice(-60)),
        noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
        dupIds: [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))],
        h1: document.querySelectorAll('h1').length,
        links: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]).filter(Boolean),
      }
    })
    const add = (msg) => problems.push(`[${label}] ${path}: ${msg}`)
    if (res.status() !== 200) add(`status ${res.status()}`)
    if (r.overflow > 0) add(`horizontal overflow ${r.overflow}px`)
    if (r.broken.length) add(`broken images ${r.broken.join(', ')}`)
    if (r.noAlt) add(`${r.noAlt} img without alt`)
    if (r.dupIds.length) add(`duplicate ids ${r.dupIds.join(', ')}`)
    if (r.h1 !== 1) add(`${r.h1} h1 elements`)
    for (const e of errors) add(`console: ${e}`)
    for (const l of r.links) if (!linkStatus.has(l)) linkStatus.set(l, null)
    await p.close()
  }
  await ctx.close()
}
for (const l of linkStatus.keys()) {
  const r = await fetch(BASE + l, { redirect: 'manual' })
  if (r.status >= 400) problems.push(`broken link ${l} → ${r.status}`)
}
console.log(`checked ${PAGES.length} pages × 2 viewports, ${linkStatus.size} internal links`)
console.log(problems.length ? problems.join('\n') : 'no problems found')
await b.close()
