import type { NextConfig } from 'next'

/**
 * Public site configuration.
 *
 * Tuned for self-hosting on an Ubuntu VPS behind Nginx - no Vercel-specific
 * features are used. `output: 'standalone'` produces a self-contained bundle
 * that PM2 can run without the full node_modules tree.
 */

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Content Security Policy.
 *
 * `unsafe-inline` on script-src is required by Next.js's inline bootstrap and
 * by the GA4 snippet. It is scoped as tightly as the framework allows;
 * everything else is locked to self plus the specific third parties in use.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isProduction ? '' : "'unsafe-eval'"} https://www.googletagmanager.com https://www.google-analytics.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com",
  // Google My Maps embeds for each excursion's route.
  "frame-src 'self' https://www.google.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
]
  .filter(Boolean)
  .join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  // Workspace packages ship TypeScript source rather than compiled output, so
  // Next must run them through its own compiler.
  transpilePackages: ['@vamos/db', '@vamos/types', '@vamos/validation', '@vamos/email', '@vamos/shared'],

  experimental: {
    // One image encode at a time: the VPS has two cores, and parallel sharp
    // work is what spiked memory. Requests queue for milliseconds instead.
    imgOptConcurrency: 1,
    // Stream large source JPEGs instead of decoding them whole into memory.
    imgOptSequentialRead: true,
  },

  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg', 'nodemailer', 'bcryptjs'],

  images: {
    /*
     * WebP only. AVIF is ~20% smaller but costs several times the CPU and
     * memory to encode, and on this 2-vCPU VPS the encoder was driving the
     * web process past its memory ceiling under ordinary traffic, getting it
     * restarted mid-request several times an hour. Every optimised image is
     * then cached for 30 days, so WebP's extra bytes are paid once per size.
     */
    formats: ['image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
      {
        // Payment webhooks must never be cached or indexed.
        source: '/api/webhooks/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },

  async redirects() {
    return [
      // Canonical host: www → apex. Nginx also enforces this; keeping it here
      // means the rule survives a misconfigured proxy.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.vamoscalafate.com' }],
        destination: `${siteUrl}/:path*`,
        permanent: true,
      },
      // Spanish-language aliases people type or that appear in old links.
      { source: '/tours', destination: '/excursiones', permanent: true },
      { source: '/tours/:slug', destination: '/excursiones/:slug', permanent: true },
      { source: '/excursions', destination: '/excursiones', permanent: true },
      { source: '/transfers', destination: '/traslados', permanent: true },
      { source: '/hotels', destination: '/hoteles', permanent: true },
      { source: '/contact', destination: '/contacto', permanent: true },
      { source: '/faq', destination: '/preguntas-frecuentes', permanent: true },
      // Tours renamed when the real catalogue replaced the launch placeholders.
      { source: '/excursiones/el-chalten-dia-completo', destination: '/excursiones/el-chalten-trekking-libre', permanent: true },
      { source: '/excursiones/trekking-cerro-frias', destination: '/excursiones/aventuras-cerro-frias', permanent: true },
      // Placeholder tours that are not part of the catalogue: send visitors to
      // the closest real excursion rather than a 404.
      { source: '/excursiones/perito-moreno-con-navegacion', destination: '/excursiones/safari-nautico-perito-moreno', permanent: true },
      { source: '/excursiones/cabalgata-patagonica', destination: '/excursiones/aventuras-cerro-frias', permanent: true },
      { source: '/excursiones/balcones-de-calafate-4x4', destination: '/excursiones/aventuras-cerro-frias', permanent: true },
      { source: '/excursiones/:slug(estancia-patagonica-dia-de-campo|city-tour-el-calafate|glaciarium-museo-del-hielo|kayak-lago-argentino)', destination: '/excursiones', permanent: true },
      { source: '/traslados/:slug*', destination: '/excursiones', permanent: false },
      { source: '/traslados', destination: '/excursiones', permanent: false },
    ]
  },
}

export default nextConfig
