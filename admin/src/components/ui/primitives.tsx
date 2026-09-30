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
  primary: 'bg-glacier-700 text-white hover:bg-glacier-800 focus-visible:ring-glacier-600',
  secondary: 'bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-slate-600',
  outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-glacier-600',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-glacier-600',
  danger: 'bg-[#9b3232] text-white hover:bg-[#832a2a] focus-visible:ring-[#9b3232]',
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
  DRAFT: 'bg-status-neutralBg text-status-neutral ring-slate-200',
  IN_REVIEW: 'bg-status-warningBg text-status-warning ring-[#eddfc0]',
  PUBLISHED: 'bg-status-successBg text-status-success ring-[#c9e2d4]',
  ARCHIVED: 'bg-slate-100 text-slate-500 ring-slate-200',
  // Bookings
  PENDING: 'bg-status-warningBg text-status-warning ring-[#eddfc0]',
  AWAITING_PAYMENT: 'bg-status-warningBg text-status-warning ring-[#eddfc0]',
  PAID: 'bg-status-infoBg text-status-info ring-glacier-200',
  CONFIRMED: 'bg-status-successBg text-status-success ring-[#c9e2d4]',
  CANCELLED: 'bg-status-dangerBg text-status-danger ring-[#f0d2d2]',
  COMPLETED: 'bg-status-successBg text-status-success ring-[#c9e2d4]',
  REFUNDED: 'bg-slate-100 text-slate-600 ring-slate-200',
  // Payments
  APPROVED: 'bg-status-successBg text-status-success ring-[#c9e2d4]',
  REJECTED: 'bg-status-dangerBg text-status-danger ring-[#f0d2d2]',
  // Submissions
  UNDER_REVIEW: 'bg-status-infoBg text-status-info ring-glacier-200',
  NEEDS_INFORMATION: 'bg-status-warningBg text-status-warning ring-[#eddfc0]',
  // Contact
  NEW: 'bg-status-infoBg text-status-info ring-glacier-200',
  IN_PROGRESS: 'bg-status-warningBg text-status-warning ring-[#eddfc0]',
  RESOLVED: 'bg-status-successBg text-status-success ring-[#c9e2d4]',
  SPAM: 'bg-slate-100 text-slate-500 ring-slate-200',
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
        STATUS_TONES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200',
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
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-[0.8125rem] text-slate-500">{description}</p> : null}
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
    <div className="rounded-panel border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <h2 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-slate-500">
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
    info: 'border-glacier-600 bg-status-infoBg text-status-info',
    success: 'border-[#2f6f4f] bg-status-successBg text-status-success',
    warning: 'border-[#c9942a] bg-status-warningBg text-status-warning',
    danger: 'border-[#9b3232] bg-status-dangerBg text-status-danger',
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
