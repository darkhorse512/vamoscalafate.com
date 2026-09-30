'use client'

import { MessageCircle } from 'lucide-react'
import { whatsappUrl } from '@vamos/shared'
import { analytics } from '@/lib/analytics'

/**
 * Floating WhatsApp action.
 *
 * Renders nothing when NEXT_PUBLIC_WHATSAPP_NUMBER is unset, rather than
 * linking to a broken wa.me URL. The number is never hard-coded in a component.
 */
export function WhatsAppButton({
  message = 'Hola, quiero consultar por una excursión en El Calafate.',
  context = 'floating',
}: {
  message?: string
  context?: string
}) {
  const href = whatsappUrl(message)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => analytics.clickWhatsapp(context)}
      aria-label="Consultar por WhatsApp"
      className="fixed bottom-4 right-4 z-40 grid size-[3.25rem] place-items-center rounded-full bg-[#25D366] text-white shadow-float transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </a>
  )
}
