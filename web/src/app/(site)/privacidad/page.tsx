import type { Metadata } from 'next'
import { LegalPage, renderLegalMetadata } from '@/components/content/LegalPage'

export async function generateMetadata(): Promise<Metadata> {
  return renderLegalMetadata('privacidad', 'Política de Privacidad')
}

export default function Page() {
  return <LegalPage slug="privacidad" />
}
