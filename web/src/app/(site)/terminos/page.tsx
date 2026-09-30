import type { Metadata } from 'next'
import { LegalPage, renderLegalMetadata } from '@/components/content/LegalPage'

export async function generateMetadata(): Promise<Metadata> {
  return renderLegalMetadata('terminos', 'Términos y Condiciones')
}

export default function Page() {
  return <LegalPage slug="terminos" />
}
