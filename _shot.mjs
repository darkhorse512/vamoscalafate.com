import { chromium } from '@playwright/test'
const out = process.argv[2]
const b = await chromium.launch()

// Hero, on each slide, so the brightest photograph is checked too.
const p = await b.newPage({ viewport: { width: 1366, height: 900 } })
await p.goto('https://vamoscalafate.com/', { waitUntil: 'networkidle', timeout: 60000 })
await p.getByRole('button', { name: /Aceptar/i }).click().catch(() => {})
await p.waitForTimeout(2500)
await p.screenshot({ path: `${out}/hero-1.png` })
await p.getByRole('tab', { name: /Minitrekking/i }).click()
await p.waitForTimeout(2200)
await p.screenshot({ path: `${out}/hero-2.png` })
await p.getByRole('tab', { name: /Todo Glaciares/i }).click()
await p.waitForTimeout(2200)
await p.screenshot({ path: `${out}/hero-3.png` })
await p.close()
await b.close(); console.log('done')
