'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * FAQ accordion.
 *
 * Built on <details>/<summary>-like semantics with explicit ARIA rather than
 * native <details>, so the open state can be animated and controlled. Answers
 * stay in the DOM when collapsed, which means they remain crawlable and
 * findable with the browser's in-page search.
 */
export function FaqList({
  faqs,
  className,
}: {
  faqs: { id?: string; question: string; answer: string }[]
  className?: string
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (faqs.length === 0) return null

  return (
    <div className={cn('divide-y divide-stone-200 border-y border-stone-200', className)}>
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index
        const panelId = `faq-panel-${index}`
        const buttonId = `faq-button-${index}`

        return (
          <div key={faq.id ?? index}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-start justify-between gap-4 py-4 text-left transition-colors hover:text-glacier-800"
              >
                <span className="font-sans text-[0.9375rem] font-semibold text-lenga-950">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    'mt-0.5 size-4 shrink-0 text-lenga-500 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-5 pr-8 text-[0.9375rem] leading-relaxed text-lenga-700"
            >
              {faq.answer.split('\n\n').map((paragraph, i) => (
                <p key={i} className={i > 0 ? 'mt-3' : undefined}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
