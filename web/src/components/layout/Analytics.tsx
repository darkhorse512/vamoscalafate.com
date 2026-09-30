'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { GA_ID, analytics } from '@/lib/analytics'
import { useConsent } from '@/lib/use-consent'

/**
 * GA4 loader.
 *
 * The tag is only injected once consent has been granted, so a visitor who
 * declines never downloads it - this is both a privacy requirement and a
 * measurable performance win on the first page view.
 *
 * `strategy="afterInteractive"` keeps the script off the critical path.
 */

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
    analytics.pageView(query ? `${pathname}?${query}` : pathname, document.title)
  }, [pathname, searchParams])

  return null
}

export function Analytics() {
  // Subscribed through useSyncExternalStore, so a choice made in the banner
  // (or in another tab) loads the tag without a page reload - and without the
  // cascading render an effect-plus-setState would cause.
  const consent = useConsent()

  if (!GA_ID || consent !== 'granted') return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'granted'
          });
          gtag('config', '${GA_ID}', { send_page_view: false, anonymize_ip: true });
        `}
      </Script>

      {/* useSearchParams needs a Suspense boundary or it opts the whole tree
          out of static rendering. */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  )
}
