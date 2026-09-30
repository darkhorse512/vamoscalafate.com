import type { Metadata } from 'next'
import { LegalPage, renderLegalMetadata } from '@/components/content/LegalPage'

export async function generateMetadata(): Promise<Metadata> {
  return renderLegalMetadata('politica-de-cookies', 'Política de Cookies')
}

export default function Page() {
  return <LegalPage slug="politica-de-cookies" />
}
