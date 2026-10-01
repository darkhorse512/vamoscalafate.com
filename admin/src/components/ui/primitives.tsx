import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Admin UI primitives.
 *
 * Intentionally plainer than the public site's: this is a tool, and visual
 * flourish gets in the way of scanning a table of bookings.
 */

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-control font-medium ' +
  'transition-colors disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-violet-700 text-white hover:bg-violet-800 focus-visible:ring-primary',
  secondary: 'bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-slate-600',
  outline: 'border border-border-strong bg-surface text-foreground hover:bg-surface-muted focus-visible:ring-primary',
  ghost: 'text-muted-foreground hover:bg-surface-strong hover:text-heading focus-visible:ring-primary',
  danger: 'bg-status-danger text-white hover:bg-status-danger focus-visible:ring-status-danger',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem]',
  md: 'h-9.5 px-4 text-[0.875rem]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  href,
  children,
}: {
  variant?: Variant
  size?: Size
  className?: string
  href: string
  children: ReactNode
}) {
  return (
    <Link href={href} className={cn(BASE, VARIANTS[variant], SIZES[size], className)}>
      {children}
    </Link>
  )
}

/**
 * Status badge.
 *
 * The tone-per-status map lives here so a PENDING booking looks identical on
 * the dashboard, in the list and on the detail page.
 */
const STATUS_TONES: Record<string, string> = {
  // Content
  DRAFT: 'bg-status-neutralBg text-status-neutral ring-border',
  IN_REVIEW: 'bg-status-warningBg text-status-warning ring-status-warning/30',
  PUBLISHED: 'bg-status-successBg text-status-success ring-status-success/30',
  ARCHIVED: 'bg-surface-strong text-subtle-foreground ring-border',
  // Bookings
  PENDING: 'bg-status-warningBg text-status-warning ring-status-warning/30',
  AWAITING_PAYMENT: 'bg-status-warningBg text-status-warning ring-status-warning/30',
  PAID: 'bg-status-infoBg text-status-info ring-primary/30',
  CONFIRMED: 'bg-status-successBg text-status-success ring-status-success/30',
  CANCELLED: 'bg-status-dangerBg text-status-danger ring-status-danger/30',
  COMPLETED: 'bg-status-successBg text-status-success ring-status-success/30',
  REFUNDED: 'bg-surface-strong text-muted-foreground ring-border',
  // Payments
  APPROVED: 'bg-status-successBg text-status-success ring-status-success/30',
  REJECTED: 'bg-status-dangerBg text-status-danger ring-status-danger/30',
  // Submissions
  UNDER_REVIEW: 'bg-status-infoBg text-status-info ring-primary/30',
  NEEDS_INFORMATION: 'bg-status-warningBg text-status-warning ring-status-warning/30',
  // Contact
  NEW: 'bg-status-infoBg text-status-info ring-primary/30',
  IN_PROGRESS: 'bg-status-warningBg text-status-warning ring-status-warning/30',
  RESOLVED: 'bg-status-successBg text-status-success ring-status-success/30',
  SPAM: 'bg-surface-strong text-subtle-foreground ring-border',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En revisión',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
  PENDING: 'Pendiente',
  AWAITING_PAYMENT: 'Esperando pago',
  PAID: 'Pagada',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  REFUNDED: 'Reembolsada',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  UNDER_REVIEW: 'En revisión',
  NEEDS_INFORMATION: 'Faltan datos',
  NEW: 'Nueva',
  IN_PROGRESS: 'En curso',
  RESOLVED: 'Resuelta',
  SPAM: 'Spam',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1 ring-inset',
        STATUS_TONES[status] ?? 'bg-surface-strong text-muted-foreground ring-border',
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-heading">{title}</h1>
        {description ? <p className="mt-1 text-[0.8125rem] text-subtle-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-panel border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
      <h2 className="text-[0.9375rem] font-semibold text-heading">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-subtle-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

/** Inline alert, used for form-level errors and operational warnings. */
export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  children: ReactNode
}) {
  const tones = {
    info: 'border-primary bg-status-infoBg text-status-info',
    success: 'border-status-success bg-status-successBg text-status-success',
    warning: 'border-status-warning bg-status-warningBg text-status-warning',
    danger: 'border-status-danger bg-status-dangerBg text-status-danger',
  }

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-control border-l-[3px] p-3.5', tones[tone])}
    >
      {title ? <p className="text-[0.8125rem] font-semibold">{title}</p> : null}
      <div className={cn('text-[0.8125rem] leading-relaxed', title && 'mt-1')}>{children}</div>
    </div>
  )
}
