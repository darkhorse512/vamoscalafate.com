import { formatMoney } from '@vamos/shared'
import { cn } from '@/lib/utils'

/**
 * Price display.
 *
 * "Desde" is shown whenever the figure is the cheapest of several options, so
 * a traveller is never surprised at checkout by a higher total than the card
 * advertised.
 */
export function Price({
  cents,
  currency = 'ARS',
  from = false,
  size = 'md',
  perPerson = true,
  className,
}: {
  cents: number | null | undefined
  currency?: string
  from?: boolean
  size?: 'sm' | 'md' | 'lg'
  perPerson?: boolean
  className?: string
}) {
  if (cents === null || cents === undefined) {
    return <span className={cn('text-sm text-muted-foreground', className)}>Consultar precio</span>
  }

  const sizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-[1.75rem]',
  }

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1.5', className)}>
      {from ? (
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          Desde
        </span>
      ) : null}

      <span className={cn('font-display font-bold text-heading', sizes[size])}>
        {formatMoney(cents, currency)}
      </span>

      {perPerson ? (
        <span className="text-xs font-medium text-muted-foreground">por persona</span>
      ) : null}
    </span>
  )
}
