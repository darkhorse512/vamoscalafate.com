'use client'

import { publicEnv } from '@vamos/shared'

/**
 * Centralised GA4 analytics.
 *
 * Components call the named helpers below; no component ever touches
 * `window.gtag` directly. That keeps event names consistent, makes the tracked
 * surface auditable from one file, and means swapping analytics vendors is a
 * single-file change.
 *
 * Nothing is sent when NEXT_PUBLIC_GA_ID is unset or consent has not been
 * granted - the script is not even loaded in that case.
 */

type GtagParams = Record<string, string | number | boolean | undefined | object>

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export const GA_ID = publicEnv.NEXT_PUBLIC_GA_ID
export const CONSENT_STORAGE_KEY = 'vc_cookie_consent'

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'granted'
  } catch {
    // Private browsing or blocked site data. Treat as no consent.
    return false
  }
}

function send(event: string, params: GtagParams = {}): void {
  if (typeof window === 'undefined' || !GA_ID) return
  if (!hasAnalyticsConsent()) return
  window.gtag?.('event', event, params)
}

/** Normalised e-commerce item shape, shared by the funnel events. */
export type AnalyticsItem = {
  item_id: string
  item_name: string
  item_category?: string
  /** Major units - GA4 expects a decimal, not minor units. */
  price?: number
  quantity?: number
}

export const analytics = {
  pageView(path: string, title?: string) {
    if (typeof window === 'undefined' || !GA_ID || !hasAnalyticsConsent()) return
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_title: title,
      page_location: window.location.href,
    })
  },

  viewItem(item: AnalyticsItem, currency: string) {
    send('view_item', { currency, value: item.price ?? 0, items: [item] })
  },

  selectItem(item: AnalyticsItem, listName?: string) {
    send('select_item', { item_list_name: listName, items: [item] })
  },

  search(searchTerm: string, resultCount?: number) {
    send('search', { search_term: searchTerm, result_count: resultCount })
  },

  bookingStarted(item: AnalyticsItem, currency: string) {
    send('booking_started', { currency, value: item.price ?? 0, items: [item] })
  },

  beginCheckout(items: AnalyticsItem[], valueMajorUnits: number, currency: string) {
    send('begin_checkout', { currency, value: valueMajorUnits, items })
  },

  addPaymentInfo(paymentType: string, valueMajorUnits: number, currency: string) {
    send('add_payment_info', { payment_type: paymentType, value: valueMajorUnits, currency })
  },

  /** Fired once on the confirmation page, keyed by booking reference. */
  purchase(args: {
    transactionId: string
    valueMajorUnits: number
    currency: string
    items: AnalyticsItem[]
  }) {
    send('purchase', {
      transaction_id: args.transactionId,
      value: args.valueMajorUnits,
      currency: args.currency,
      items: args.items,
    })
  },

  generateLead(source: string) {
    send('generate_lead', { lead_source: source })
  },

  hotelSubmission() {
    send('hotel_submission')
  },

  contact(subject?: string) {
    send('contact', { subject })
  },

  clickWhatsapp(context: string) {
    send('click_whatsapp', { context })
  },

  clickPhone(context: string) {
    send('click_phone', { context })
  },

  clickEmail(context: string) {
    send('click_email', { context })
  },
}
