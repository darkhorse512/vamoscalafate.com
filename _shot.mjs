import { chromium } from '@playwright/test'
const out = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1366, height: 900 } })
await p.goto('https://vamoscalafate.com/', { waitUntil: 'networkidle', timeout: 60000 })
await p.getByRole('button', { name: /Aceptar/i }).click().catch(() => {})
await p.waitForTimeout(2500)
await p.screenshot({ path: `${out}/hero-now.png` })
await b.close(); console.log('done')
