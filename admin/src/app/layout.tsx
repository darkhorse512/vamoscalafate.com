import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', 'arial'],
})

/**
 * The admin must never be indexed (spec §48). This is enforced in three
 * independent places, because any one of them could be missed in a future
 * change: here in the metadata, in `robots.ts`, and as an `X-Robots-Tag`
 * response header in next.config.ts.
 */
export const metadata: Metadata = {
  title: {
    default: 'Administración | Vamos Calafate',
    template: '%s | Administración',
  },
  description: 'Panel de administración de Vamos Calafate.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1d252b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
