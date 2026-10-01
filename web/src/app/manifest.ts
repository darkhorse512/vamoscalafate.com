import type { MetadataRoute } from 'next'
import { SITE } from '@vamos/shared'

/**
 * Web app manifest: the name and icon used when the site is added to a
 * phone's home screen. Icons come from scripts/generate-brand-assets.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: 'Vamos Calafate',
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#200033',
    lang: 'es-AR',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
