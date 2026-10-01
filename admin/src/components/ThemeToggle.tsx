'use client'

import { useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { THEME_STORAGE_KEY } from './ThemeScript'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
]

/**
 * The chosen theme is browser state, not React state.
 *
 * It lives in localStorage and on `<html data-theme>`, both of which are
 * written before React boots (see ThemeScript) and can change in another tab.
 * `useSyncExternalStore` reads from that single source of truth, so there is
 * no second copy to fall out of step and no setState-in-an-effect to sync one.
 */
const listeners = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  // `storage` fires in OTHER tabs, keeping a second window in agreement.
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // Private browsing or blocked site data: fall back to following the OS.
  }
  return 'system'
}

/**
 * The server cannot know the reader's choice, so it reports "system" and the
 * stylesheet's `prefers-color-scheme` rule renders the right thing. The first
 * client read then corrects the highlighted button if a choice was stored.
 */
function getServerSnapshot(): Theme {
  return 'system'
}

function setTheme(next: Theme): void {
  try {
    if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Storage refused the write; still apply it for this page view.
  }

  if (next === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = next

  for (const listener of listeners) listener()
}

/**
 * Three-way theme control: light, dark, or follow the operating system.
 *
 * "System" is a real option rather than a hidden default. A reader whose OS
 * switches at dusk wants the site to follow; one who deliberately chose light
 * wants it to stay light at night. Those are different intents, so "system"
 * is stored as the absence of a stored choice.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <div
      role="radiogroup"
      aria-label="Tema de color"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-control border border-border bg-surface-muted p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'grid size-6 place-items-center rounded-[0.25rem] transition-colors',
              active
                ? 'bg-surface text-primary shadow-card'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
