import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import { SITE, absoluteUrl, publicEnv } from '@vamos/shared'
import { Analytics } from '@/components/layout/Analytics'
import { CookieConsent } from '@/components/layout/CookieConsent'
import { ThemeScript } from '@/components/layout/ThemeScript'
import { jsonLdScript, organizationSchema, websiteSchema } from '@/lib/jsonld'
import './globals.css'

/**
 * Fonts are self-hosted by next/font: the files are downloaded at build time
 * and served from our own origin. That removes a third-party connection from
 * the critical path and eliminates the layout shift a late-arriving webfont
 * would cause. `display: swap` plus an explicit fallback keeps text visible
 * throughout.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', 'arial'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['600', '700'],
  style: ['normal'],
  fallback: ['Georgia', 'serif'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} - Excursiones y traslados en El Calafate`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} - Excursiones y traslados en El Calafate`,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  ...(publicEnv.NEXT_PUBLIC_GSC_VERIFICATION
    ? { verification: { google: publicEnv.NEXT_PUBLIC_GSC_VERIFICATION } }
    : {}),
  formatDetection: { telephone: false, address: false, email: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /*
   * Per-theme browser chrome. A single value would leave the address bar
   * light while the page is dark, which looks like a rendering fault on
   * mobile Safari and Chrome.
   */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#150024' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const siteSchema = jsonLdScript([organizationSchema(), websiteSchema()])

  return (
    <html
      lang="es-AR"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      {/* `suppressHydrationWarning`: ThemeScript sets data-theme on <html>
          before React hydrates, so the client markup legitimately differs
          from the server's. The warning would be noise. */}
      <head>
        <ThemeScript />
        {siteSchema ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={siteSchema} />
        ) : null}
      </head>
      <body>
        {/* First focusable element: lets keyboard users bypass the nav. */}
        <a href="#contenido" className="skip-link">
          Saltar al contenido principal
        </a>

        {children}

        <CookieConsent />
        <Analytics />
      </body>
    </html>
  )
}
