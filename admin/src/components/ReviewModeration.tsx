'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/primitives'
import { moderateReviewAction } from '@/server/actions/content'

/** Approve / reject controls for a single review. */
export function ReviewModeration({
  reviewId,
  currentStatus,
}: {
  reviewId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function moderate(status: 'APPROVED' | 'REJECTED') {
    setError(null)
    startTransition(async () => {
      const result = await moderateReviewAction({ reviewId, status })
      if (!result.ok) setError(result.message)
      else router.refresh()
    })
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      {currentStatus !== 'APPROVED' ? (
        <Button size="sm" disabled={pending} onClick={() => moderate('APPROVED')}>
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          Aprobar y publicar
        </Button>
      ) : null}

      {currentStatus !== 'REJECTED' ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => moderate('REJECTED')}>
          Rechazar
        </Button>
      ) : null}

      {error ? (
        <p role="alert" className="text-[0.75rem] text-status-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
