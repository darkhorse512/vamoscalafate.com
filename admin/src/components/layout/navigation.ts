import type { Resource } from '@vamos/shared'

/**
 * Admin navigation.
 *
 * Each item declares the `resource` it needs. The sidebar filters itself
 * against the signed-in user's role, so a BOOKING_MANAGER simply never sees
 * the blog section. Hiding the link is a usability measure - the actual access
 * control is the requirePermission() call inside each page.
 */

export type NavItem = {
  label: string
  href: string
  icon: string
  resource: Resource
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'General',
    items: [{ label: 'Panel', href: '/dashboard', icon: 'LayoutDashboard', resource: 'dashboard' }],
  },
  {
    title: 'Comercial',
    items: [
      { label: 'Reservas', href: '/bookings', icon: 'CalendarCheck', resource: 'bookings' },
      { label: 'Clientes', href: '/customers', icon: 'Users', resource: 'customers' },
      { label: 'Pagos', href: '/payments', icon: 'CreditCard', resource: 'payments' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { label: 'Excursiones', href: '/tours', icon: 'Mountain', resource: 'tours' },
      { label: 'Categorías', href: '/categories', icon: 'Tags', resource: 'categories' },
      { label: 'Destinos', href: '/destinations', icon: 'MapPin', resource: 'destinations' },
      { label: 'Atracciones', href: '/attractions', icon: 'Landmark', resource: 'attractions' },
    ],
  },
  {
    title: 'Guía local',
    items: [
      { label: 'Hoteles', href: '/hotels', icon: 'BedDouble', resource: 'hotels' },
      { label: 'Comercios', href: '/businesses', icon: 'Store', resource: 'businesses' },
      { label: 'Solicitudes', href: '/submissions', icon: 'Inbox', resource: 'submissions' },
      { label: 'Reseñas', href: '/reviews', icon: 'Star', resource: 'reviews' },
    ],
  },
  {
    title: 'Contenido',
    items: [
      { label: 'Blog', href: '/blog', icon: 'FileText', resource: 'blog' },
      { label: 'Medios', href: '/media', icon: 'Image', resource: 'media' },
      { label: 'SEO', href: '/seo', icon: 'Search', resource: 'seo' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Ajustes', href: '/settings', icon: 'Settings', resource: 'settings' },
      { label: 'Usuarios', href: '/users', icon: 'Shield', resource: 'users' },
      { label: 'Auditoría', href: '/audit-log', icon: 'ScrollText', resource: 'audit' },
    ],
  },
]
