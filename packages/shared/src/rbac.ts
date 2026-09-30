/**
 * Role-based access control — the single source of truth.
 *
 * Authorization is resolved from this in-process matrix so that a permission
 * check costs no database round-trip (middleware and every server action run
 * one). `pnpm db:seed` mirrors the matrix into the Role / Permission tables so
 * the admin UI can display it, but the tables are never consulted to make an
 * access decision.
 */

export const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'EDITOR',
  'BOOKING_MANAGER',
  'CONTENT_MANAGER',
] as const

export type AdminRoleKey = (typeof ADMIN_ROLES)[number]

export const RESOURCES = [
  'dashboard',
  'tours',
  'categories',
  'bookings',
  'customers',
  'payments',
  'hotels',
  'businesses',
  'submissions',
  'blog',
  'reviews',
  'destinations',
  'attractions',
  'media',
  'seo',
  'settings',
  'users',
  'audit',
] as const

export type Resource = (typeof RESOURCES)[number]
export type Action = 'read' | 'create' | 'update' | 'delete' | 'publish' | 'refund'

export type Permission = `${Resource}:${Action}`

export const ROLE_DESCRIPTIONS: Record<AdminRoleKey, { name: string; description: string }> = {
  SUPER_ADMIN: {
    name: 'Super administrador',
    description: 'Acceso total, incluida la gestión de usuarios y la configuración del sitio.',
  },
  ADMIN: {
    name: 'Administrador',
    description: 'Gestiona todo el contenido y las operaciones, salvo usuarios y ajustes críticos.',
  },
  EDITOR: {
    name: 'Editor',
    description: 'Edita excursiones, destinos, blog y biblioteca de medios.',
  },
  BOOKING_MANAGER: {
    name: 'Gestor de reservas',
    description: 'Gestiona reservas, clientes y pagos.',
  },
  CONTENT_MANAGER: {
    name: 'Gestor de contenidos',
    description: 'Gestiona blog, destinos, hoteles, comercios y solicitudes de alta.',
  },
}

const ALL_ACTIONS: Action[] = ['read', 'create', 'update', 'delete', 'publish']

function all(resources: readonly Resource[], actions: readonly Action[] = ALL_ACTIONS): Permission[] {
  return resources.flatMap((r) => actions.map((a) => `${r}:${a}` as Permission))
}

const CONTENT_RESOURCES: Resource[] = ['tours', 'categories', 'destinations', 'attractions', 'media']
const EDITORIAL_RESOURCES: Resource[] = ['blog', 'destinations', 'hotels', 'businesses', 'media']

/**
 * SUPER_ADMIN is intentionally not enumerated — `can()` short-circuits for it,
 * so adding a new resource never accidentally locks the owner out.
 */
export const ROLE_PERMISSIONS: Record<AdminRoleKey, Permission[]> = {
  SUPER_ADMIN: [],

  ADMIN: [
    'dashboard:read',
    ...all([
      'tours',
      'categories',
      'bookings',
      'customers',
      'payments',
      'hotels',
      'businesses',
      'submissions',
      'blog',
      'reviews',
      'destinations',
      'attractions',
      'media',
      'seo',
    ]),
    'payments:refund',
    'settings:read',
    'audit:read',
  ],

  EDITOR: [
    'dashboard:read',
    ...all(CONTENT_RESOURCES, ['read', 'create', 'update']),
    ...all(['blog'], ['read', 'create', 'update']),
    'seo:read',
    'seo:update',
    'reviews:read',
  ],

  BOOKING_MANAGER: [
    'dashboard:read',
    ...all(['bookings', 'customers'], ['read', 'create', 'update']),
    'payments:read',
    'payments:update',
    'payments:refund',
    'tours:read',
    'reviews:read',
    'reviews:update',
  ],

  CONTENT_MANAGER: [
    'dashboard:read',
    ...all(EDITORIAL_RESOURCES, ['read', 'create', 'update', 'publish']),
    ...all(['submissions'], ['read', 'update']),
    'reviews:read',
    'reviews:update',
    'seo:read',
    'seo:update',
    'attractions:read',
    'attractions:create',
    'attractions:update',
  ],
}

/** Authoritative permission check. SUPER_ADMIN always passes. */
export function can(role: AdminRoleKey, permission: Permission): boolean {
  if (role === 'SUPER_ADMIN') return true
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/** True when the role may open a section at all (i.e. has any `read` grant). */
export function canAccessResource(role: AdminRoleKey, resource: Resource): boolean {
  return can(role, `${resource}:read`)
}

/** Every permission a role holds — used to render the admin's role screen. */
export function permissionsForRole(role: AdminRoleKey): Permission[] {
  if (role === 'SUPER_ADMIN') {
    return RESOURCES.flatMap((r) => [...ALL_ACTIONS, 'refund' as Action].map((a) => `${r}:${a}` as Permission))
  }
  return ROLE_PERMISSIONS[role] ?? []
}

/** Human-readable label for a permission key, for the admin UI and seed data. */
export function describePermission(permission: Permission): string {
  const [resource, action] = permission.split(':') as [Resource, Action]
  const actionLabels: Record<Action, string> = {
    read: 'Ver',
    create: 'Crear',
    update: 'Editar',
    delete: 'Eliminar',
    publish: 'Publicar',
    refund: 'Reembolsar',
  }
  return `${actionLabels[action] ?? action} ${resource}`
}
