'use client'

import { useSyncExternalStore } from 'react'
import { CONSENT_STORAGE_KEY } from './analytics'

/**
 * Cookie-consent state as a React external store.
 *
 * `useSyncExternalStore` is the correct primitive here: consent lives in
 * `localStorage`, which is an external system React does not own. Reading it
 * in an effect and calling `setState` would cause a cascading render on every
 * mount and risk a hydration mismatch.
 *
 * The server snapshot is `null` — the server cannot know a browser's stored
 * choice, and claiming otherwise would make the first client render disagree
 * with the server HTML.
 */

export type ConsentState = 'granted' | 'denied' | null

function subscribe(onChange: () => void): () => void {
  // `storage` fires for changes made in OTHER tabs; the custom event covers
  // the current one, so a choice made here updates every listener at once.
  window.addEventListener('storage', onChange)
  window.addEventListener('vc:consent-change', onChange)

  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener('vc:consent-change', onChange)
  }
}

function getSnapshot(): ConsentState {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    // Private browsing or blocked site data. Treat as "not yet decided".
    return null
  }
}

function getServerSnapshot(): ConsentState {
  return null
}

export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Records the visitor's choice and notifies every listener. */
export function setConsent(choice: 'granted' | 'denied'): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice)
  } catch {
    // Nothing to persist to; the banner still closes for this page view.
  }
  window.dispatchEvent(new Event('vc:consent-change'))
}
