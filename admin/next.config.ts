import type { NextConfig } from 'next'

/**
 * Admin application configuration.
 *
 * Deployed as a SEPARATE Next.js process on port 3001, behind
 * admin.vamoscalafate.com. It is never mounted under the public site, so a
 * misconfigured public route can never expose an admin screen.
 *
 * Security posture is deliberately stricter than the public site: no indexing
 * at all, no framing, and a tighter CSP with no third-party script hosts.
 */

const isProduction = process.env.NODE_ENV === 'production'

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  transpilePackages: ['@vamos/db', '@vamos/types', '@vamos/validation', '@vamos/email', '@vamos/shared'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg', 'nodemailer', 'bcryptjs'],

  images: {
    formats: ['image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Belt and braces with the robots.ts file and the meta tag: the
          // admin must never appear in a search index (spec §48).
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet, noimageindex' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // No referrer at all: an admin URL can contain a record id, and
          // leaking that to an external site is needless exposure.
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Admin responses are per-user and must never be cached by a proxy.
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          ...(isProduction
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig
