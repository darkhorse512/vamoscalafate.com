import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'

/**
 * Chrome shared by every public page except the homepage, which uses its own
 * transparent-over-hero header. `pt-(--header-height)` offsets the fixed
 * header so content is never hidden underneath it.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="contenido" className="pt-(--header-height)">
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
