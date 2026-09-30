import { publicEnv } from './env.ts'

/**
 * Static brand and business facts.
 *
 * Everything here is verifiable public information about El Calafate or
 * configuration supplied by the operator. Nothing is invented - no awards,
 * certifications, ratings or customer counts. Operator-specific details that
 * vary (phone, address, social handles) come from the environment or the
 * SiteSetting table so they can be changed without a deploy.
 */

export const SITE = {
  name: 'Vamos Calafate',
  legalName: 'Vamos Calafate',
  tagline: 'Excursiones, traslados y experiencias en El Calafate',
  description:
    'Reservá excursiones al Glaciar Perito Moreno, traslados desde el aeropuerto y experiencias en El Calafate, Patagonia Argentina. Información práctica y reserva online.',
  locale: 'es_AR',
  language: 'es',
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  adminUrl: publicEnv.NEXT_PUBLIC_ADMIN_URL,
  defaultOgImage: '/og/vamos-calafate.jpg',
} as const

/** Factual geography used for local SEO and structured data. */
export const LOCATION = {
  city: 'El Calafate',
  province: 'Santa Cruz',
  region: 'Patagonia',
  country: 'Argentina',
  countryCode: 'AR',
  postalCode: '9405',
  timeZone: 'America/Argentina/Rio_Gallegos',
  // El Calafate town centre.
  latitude: -50.3379,
  longitude: -72.2648,
  airport: {
    name: 'Aeropuerto Internacional Comandante Armando Tola',
    code: 'FTE',
    // Distance published by the provincial airport authority.
    distanceFromTownKm: 23,
  },
  nationalPark: 'Parque Nacional Los Glaciares',
  landmarks: [
    'Glaciar Perito Moreno',
    'Lago Argentino',
    'Parque Nacional Los Glaciares',
    'Laguna Nimez',
    'El Chaltén',
  ],
} as const

export const CONTACT = {
  whatsappNumber: publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '',
  phone: publicEnv.NEXT_PUBLIC_CONTACT_PHONE ?? '',
  email: publicEnv.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info@vamoscalafate.com',
} as const

/** Builds a wa.me deep link. Returns null when no number is configured. */
export function whatsappUrl(message?: string): string | null {
  const number = CONTACT.whatsappNumber.replace(/\D/g, '')
  if (!number) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${text}`
}

/** Absolute URL builder - required for canonical tags, OG and sitemaps. */
export function absoluteUrl(path = '/'): string {
  const base = SITE.url.replace(/\/$/, '')
  if (!path || path === '/') return base || '/'
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/** Public route map. Centralised so a URL change is a one-line edit. */
export const ROUTES = {
  home: '/',
  tours: '/excursiones',
  tour: (slug: string) => `/excursiones/${slug}`,
  transfers: '/traslados',
  transfer: (slug: string) => `/traslados/${slug}`,
  hotels: '/hoteles',
  hotel: (slug: string) => `/hoteles/${slug}`,
  hotelRegister: '/hoteles/registrar',
  restaurants: '/restaurantes',
  restaurant: (slug: string) => `/restaurantes/${slug}`,
  services: '/servicios',
  service: (slug: string) => `/servicios/${slug}`,
  destinations: '/destinos',
  destination: (slug: string) => `/destinos/${slug}`,
  blog: '/blog',
  blogPost: (slug: string) => `/blog/${slug}`,
  search: '/buscar',
  book: '/reservar',
  checkout: '/checkout',
  contact: '/contacto',
  faq: '/preguntas-frecuentes',
  terms: '/terminos',
  privacy: '/privacidad',
  cancellation: '/politica-de-cancelacion',
  cookies: '/politica-de-cookies',
} as const
