'use client'

import { useEffect, useRef } from 'react'
import { analytics, type AnalyticsItem } from '@/lib/analytics'

const SENT_KEY_PREFIX = 'vc_purchase_sent_'

/**
 * Fires the GA4 `purchase` event exactly once per booking.
 *
 * Without the guard, a refresh or a back-navigation to this page would report
 * the same revenue again and inflate every conversion metric. The reference is
 * recorded in sessionStorage; the ref guard additionally covers React's
 * double-invoked effects in development Strict Mode.
 */
export function PurchaseTracker({
  reference,
  valueMajorUnits,
  currency,
  items,
}: {
  reference: string
  valueMajorUnits: number
  currency: string
  items: AnalyticsItem[]
}) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    const key = `${SENT_KEY_PREFIX}${reference}`

    try {
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, '1')
    } catch {
      // Storage blocked. Better to risk one duplicate than to lose the event.
    }

    analytics.purchase({
      transactionId: reference,
      valueMajorUnits,
      currency,
      items,
    })
  }, [reference, valueMajorUnits, currency, items])

  return null
}
