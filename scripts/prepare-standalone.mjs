#!/usr/bin/env node
/**
 * Finalises a Next.js `output: 'standalone'` build.
 *
 * Next deliberately leaves `.next/static` and `public/` out of the standalone
 * bundle, because they are normally served by a CDN. We serve them from the
 * same Node process behind Nginx, so they have to sit next to the generated
 * server or every asset 404s.
 *
 * Run automatically as part of `pnpm build` in each app.
 */

import { cp, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const app = process.argv[2]

if (!app) {
  console.error('Usage: prepare-standalone.mjs <web|admin>')
  process.exit(1)
}

const appRoot = process.cwd()
const standaloneRoot = path.join(appRoot, '.next', 'standalone', app)

async function exists(target) {
  try {
    await access(target, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await exists(standaloneRoot))) {
    console.error(
      `[prepare-standalone] ${standaloneRoot} not found. ` +
        'Did `next build` run with output: "standalone"?',
    )
    process.exit(1)
  }

  await cp(
    path.join(appRoot, '.next', 'static'),
    path.join(standaloneRoot, '.next', 'static'),
    { recursive: true },
  )
  console.log('[prepare-standalone] copied .next/static')

  if (await exists(path.join(appRoot, 'public'))) {
    await cp(path.join(appRoot, 'public'), path.join(standaloneRoot, 'public'), {
      recursive: true,
    })
    console.log('[prepare-standalone] copied public/')
  }

  console.log(`[prepare-standalone] ${app} ready: node .next/standalone/${app}/server.js`)
}

main().catch((error) => {
  console.error('[prepare-standalone] failed:', error)
  process.exit(1)
})
