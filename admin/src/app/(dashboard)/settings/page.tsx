import Link from 'next/link'
import type { Metadata } from 'next'
import { CheckCircle2, XCircle } from 'lucide-react'
import { prisma } from '@vamos/db'
import {
  isEmailConfigured, isPaymentProviderConfigured, publicEnv, serverEnv,
} from '@vamos/shared'
import { EmailTester } from '@/components/EmailTester'
import { SettingsEditor } from '@/components/SettingsEditor'
import { PageHeader } from '@/components/ui/primitives'
import { requirePermission } from '@/server/auth'

export const metadata: Metadata = { title: 'Ajustes' }
export const dynamic = 'force-dynamic'

/**
 * Settings.
 *
 * Shows integration status honestly: a provider without credentials is
 * reported as NOT configured, never as "connected". The point of this screen
 * is to let an operator see at a glance what actually works in production.
 */
export default async function SettingsPage() {
  await requirePermission('settings:read')

  const [settings, pages] = await Promise.all([
    // The homepage document has its own editor (Página de inicio).
    prisma.siteSetting.findMany({ where: { group: { not: 'homepage' } }, orderBy: [{ group: 'asc' }, { key: 'asc' }] }),
    prisma.staticPage.findMany({
      orderBy: { title: 'asc' },
      select: { id: true, slug: true, title: true, status: true, updatedAt: true },
    }),
  ])

  const env = serverEnv()

  const integrations = [
    {
      name: 'Mercado Pago',
      ok: isPaymentProviderConfigured('mercadopago'),
      detail: isPaymentProviderConfigured('mercadopago')
        ? 'Credenciales y secreto de webhook presentes.'
        : 'Faltan MERCADOPAGO_ACCESS_TOKEN y/o MERCADOPAGO_WEBHOOK_SECRET.',
      requirement: 'Webhook: /api/webhooks/mercadopago (tópico «payment»)',
    },
    {
      name: 'Stripe',
      ok: isPaymentProviderConfigured('stripe'),
      detail: isPaymentProviderConfigured('stripe')
        ? 'Credenciales y secreto de webhook presentes.'
        : 'Faltan STRIPE_SECRET_KEY y/o STRIPE_WEBHOOK_SECRET.',
      requirement: 'Webhook: /api/webhooks/stripe',
    },
    {
      name: 'Correo (Resend SMTP)',
      ok: isEmailConfigured(),
      detail: isEmailConfigured()
        ? `Envío activo desde ${env.EMAIL_FROM}.`
        : 'EMAIL_TRANSPORT no es «smtp» o falta RESEND_SMTP_PASSWORD. Los correos se registran pero NO se envían.',
      requirement: 'Dominio verificado en Resend con registros SPF, DKIM y DMARC publicados.',
    },
    {
      name: 'Google Analytics 4',
      ok: Boolean(publicEnv.NEXT_PUBLIC_GA_ID),
      detail: publicEnv.NEXT_PUBLIC_GA_ID
        ? `Measurement ID: ${publicEnv.NEXT_PUBLIC_GA_ID}`
        : 'Falta NEXT_PUBLIC_GA_ID. No se carga ningún script de analítica.',
      requirement: 'GA4 → Flujos de datos → ID de medición',
    },
    {
      name: 'Search Console',
      ok: Boolean(publicEnv.NEXT_PUBLIC_GSC_VERIFICATION),
      detail: publicEnv.NEXT_PUBLIC_GSC_VERIFICATION
        ? 'Meta de verificación presente.'
        : 'Falta NEXT_PUBLIC_GSC_VERIFICATION.',
      requirement: 'Search Console → verificación por etiqueta HTML',
    },
    {
      name: 'WhatsApp',
      ok: Boolean(publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER),
      detail: publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER
        ? `Número configurado: ${publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER}`
        : 'Falta NEXT_PUBLIC_WHATSAPP_NUMBER. El botón flotante no se muestra.',
      requirement: 'Formato internacional, solo dígitos (ej. 5492902123456)',
    },
    {
      name: 'Almacenamiento de medios',
      ok: env.STORAGE_DRIVER === 'local',
      detail:
        env.STORAGE_DRIVER === 'local'
          ? `Disco local: ${env.STORAGE_LOCAL_DIR}`
          : 'STORAGE_DRIVER="s3" está seleccionado pero el driver S3 no está implementado.',
      requirement: 'Incluir el directorio de medios en las copias de seguridad',
    },
  ]

  return (
    <>
      <PageHeader
        title="Ajustes"
        description="Configuración del sitio e integraciones externas."
      />

      <section className="mb-8">
        <h2 className="mb-3 text-[0.875rem] font-semibold text-heading">
          Estado de las integraciones
        </h2>

        <ul className="grid gap-3 sm:grid-cols-2">
          {integrations.map((integration) => (
            <li key={integration.name} className="admin-panel p-4">
              <div className="flex items-start gap-2.5">
                {integration.ok ? (
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-status-success"
                    aria-hidden="true"
                  />
                ) : (
                  <XCircle
                    className="mt-0.5 size-4 shrink-0 text-status-warning"
                    aria-hidden="true"
                  />
                )}

                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-heading">
                    {integration.name}
                    <span
                      className={`ml-2 text-[0.6875rem] font-medium ${
                        integration.ok ? 'text-status-success' : 'text-status-warning'
                      }`}
                    >
                      {integration.ok ? 'Configurada' : 'Sin configurar'}
                    </span>
                  </p>
                  <p className="mt-1 text-[0.75rem] leading-relaxed text-muted-foreground">
                    {integration.detail}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-subtle-foreground">
                    {integration.requirement}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[0.75rem] text-subtle-foreground">
          Las credenciales se configuran en el archivo <code className="font-mono">.env</code> del
          servidor y requieren reiniciar el proceso con PM2. Nunca se editan desde este panel.
        </p>

        <div className="mt-4">
          <EmailTester defaultTo={env.EMAIL_ADMIN ?? 'ventas@vamoscalafate.com'} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[0.875rem] font-semibold text-heading">Ajustes del sitio</h2>
        <SettingsEditor
          settings={settings.map((setting) => ({
            key: setting.key,
            group: setting.group,
            label: setting.label,
            value:
              typeof setting.value === 'string' || typeof setting.value === 'number'
                ? String(setting.value)
                : JSON.stringify(setting.value),
          }))}
        />
      </section>

      <section>
        <h2 className="mb-3 text-[0.875rem] font-semibold text-heading">Páginas legales</h2>
        <div className="admin-panel overflow-hidden">
          <table className="admin-table">
            <caption className="sr-only">Páginas legales editables</caption>
            <thead>
              <tr>
                <th scope="col">Página</th>
                <th scope="col">URL</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <Link
                      href={`/settings/pages/${page.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {page.title}
                    </Link>
                  </td>
                  <td className="font-mono text-[0.75rem] text-subtle-foreground">/{page.slug}</td>
                  <td>{page.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[0.75rem] text-subtle-foreground">
          Los textos legales que vienen con la instalación son plantillas estructurales, no
          documentos definitivos. Hacelos revisar por un profesional antes de operar.
        </p>
      </section>
    </>
  )
}
