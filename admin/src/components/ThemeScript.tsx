/**
 * Applies the reader's saved theme before first paint.
 *
 * This has to be a blocking inline script in <head>. Anything that runs after
 * hydration is too late: the page would paint light, then flip to dark, which
 * is the flash of wrong theme. Reading localStorage synchronously here costs
 * well under a millisecond and removes it entirely.
 *
 * No stored choice leaves the attribute unset, which is deliberate — the
 * stylesheet then falls through to `prefers-color-scheme`, so the OS setting
 * is respected without us having to guess at it.
 */
/*
 * Keyed separately from the public site: admin runs on its own subdomain, so
 * localStorage is a different store anyway, and a staff member wanting a dark
 * console has no bearing on how they read the public site.
 */
export const THEME_STORAGE_KEY = 'vamos-admin-theme'

export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}})()`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
