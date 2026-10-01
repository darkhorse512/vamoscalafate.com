'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectOption = {
  value: string
  label: string
  /** Secondary line under the label. */
  description?: string
  /** Right-aligned detail, such as a price or a count. */
  meta?: string
  disabled?: boolean
}

/**
 * Styled single-select, replacing the native <select>.
 *
 * Follows the WAI-ARIA "select-only combobox" pattern: focus stays on the
 * trigger and the highlighted option is announced through
 * `aria-activedescendant`, which is what screen readers expect from a native
 * select. Keyboard behaviour matches the native control:
 *
 *   closed  ↑ ↓ Enter Space  open        Home End  jump      letters  type-ahead
 *   open    ↑ ↓ Home End     move        Enter Space Tab  choose     Esc  close
 *
 * A native <select> cannot be styled beyond its closed state — the open list
 * is drawn by the operating system — which is why this exists at all.
 * When `name` is set, a hidden input carries the value so the control still
 * works inside a plain HTML form.
 */
export function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Elegir…',
  size = 'md',
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  disabled = false,
  leadingIcon,
}: {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  disabled?: boolean
  leadingIcon?: React.ReactNode
}) {
  const autoId = useId()
  const triggerId = id ?? `select-${autoId}`
  const listId = `${triggerId}-list`

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [placeAbove, setPlaceAbove] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef({ text: '', at: 0 })

  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value])
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const enabledIndexes = useMemo(
    () => options.flatMap((option, index) => (option.disabled ? [] : [index])),
    [options],
  )

  const step = useCallback(
    (from: number, delta: 1 | -1) => {
      if (enabledIndexes.length === 0) return -1
      const position = enabledIndexes.indexOf(from)
      if (position === -1) return delta === 1 ? enabledIndexes[0]! : enabledIndexes[enabledIndexes.length - 1]!
      const next = Math.min(enabledIndexes.length - 1, Math.max(0, position + delta))
      return enabledIndexes[next]!
    },
    [enabledIndexes],
  )

  const openList = useCallback(
    (highlight?: number) => {
      if (disabled) return
      setActive(highlight ?? (selectedIndex >= 0 ? selectedIndex : (enabledIndexes[0] ?? -1)))
      setOpen(true)
    },
    [disabled, selectedIndex, enabledIndexes],
  )

  const choose = useCallback(
    (index: number) => {
      const option = options[index]
      if (!option || option.disabled) return
      if (option.value !== value) onChange(option.value)
      setOpen(false)
    },
    [options, value, onChange],
  )

  // Flip above the trigger when there is not enough room below it.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    setPlaceAbove(below < 300 && rect.top > below)
  }, [open])

  // Keep the highlighted option in view while navigating with the keyboard.
  useEffect(() => {
    if (!open || active < 0) return
    const element = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    element?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  // Close on an outside press.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  /** Jumps to the first option starting with the typed characters. */
  function typeAhead(character: string) {
    const now = Date.now()
    const buffer = now - typeahead.current.at < 600 ? typeahead.current.text + character : character
    typeahead.current = { text: buffer, at: now }
    const needle = buffer.toLocaleLowerCase('es')
    const match = enabledIndexes.find((index) =>
      options[index]!.label.toLocaleLowerCase('es').startsWith(needle),
    )
    if (match === undefined) return
    if (open) setActive(match)
    else choose(match)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const { key } = event

    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        openList()
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault()
        choose(key === 'Home' ? enabledIndexes[0]! : enabledIndexes[enabledIndexes.length - 1]!)
      } else if (key.length === 1 && /\S/.test(key)) {
        typeAhead(key)
      }
      return
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive((current) => step(current, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive((current) => step(current, -1))
        break
      case 'Home':
        event.preventDefault()
        setActive(enabledIndexes[0] ?? -1)
        break
      case 'End':
        event.preventDefault()
        setActive(enabledIndexes[enabledIndexes.length - 1] ?? -1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        break
      case 'Tab':
        // Native behaviour: tabbing out commits the highlighted option.
        choose(active)
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      default:
        if (key.length === 1 && /\S/.test(key)) typeAhead(key)
    }
  }

  const heights = { sm: 'h-10 text-[0.8125rem]', md: 'h-12 text-sm', lg: 'h-14 text-[0.9375rem]' }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-xl border bg-surface pl-3.5 pr-3 text-left transition-all duration-150',
          'disabled:cursor-not-allowed disabled:opacity-55',
          heights[size],
          open
            ? 'border-primary ring-4 ring-primary/15'
            : 'border-border-strong hover:border-primary/50 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15',
        )}
      >
        {leadingIcon ? <span className="shrink-0 text-primary">{leadingIcon}</span> : null}
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <span className="font-medium text-heading">{selected.label}</span>
          ) : (
            <span className="text-subtle-foreground">{placeholder}</span>
          )}
        </span>
        {selected?.meta ? (
          <span className="shrink-0 text-xs font-semibold text-primary">{selected.meta}</span>
        ) : null}
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180 text-primary',
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          tabIndex={-1}
          className={cn(
            'animate-pop-in absolute inset-x-0 z-50 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-surface p-1.5 shadow-float',
            placeAbove ? 'bottom-full mb-2 origin-bottom' : 'top-full mt-2 origin-top',
          )}
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex
            const isActive = index === active
            return (
              <li
                key={option.value || `empty-${index}`}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                // Keep focus on the trigger so the combobox pattern holds.
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => !option.disabled && setActive(index)}
                onClick={() => choose(index)}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  isActive && !option.disabled && 'bg-primary-soft',
                  option.disabled && 'cursor-not-allowed opacity-45',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-4 shrink-0 place-items-center',
                    isSelected ? 'text-primary' : 'text-transparent',
                  )}
                  aria-hidden="true"
                >
                  <Check className="size-4" strokeWidth={2.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-sm leading-snug',
                      isSelected ? 'font-semibold text-primary' : 'font-medium text-heading',
                    )}
                  >
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {option.meta ? (
                  <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground">
                    {option.meta}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
