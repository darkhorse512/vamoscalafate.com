import { ROUTES } from '@vamos/shared'

/**
 * Navigation model.
 *
 * Defined once and consumed by the desktop header, the mobile drawer and the
 * footer, so the three can never disagree about what the site contains.
 */

export type NavChild = { label: string; href: string; description?: string }
export type NavItem = { label: string; href: string; children?: NavChild[] }

export const PRIMARY_NAV: NavItem[] = [
  {
    label: 'Excursiones',
    href: ROUTES.tours,
    children: [
      { label: 'Todas las excursiones', href: ROUTES.tours, description: 'El catálogo completo' },
      { label: 'Glaciares', href: `${ROUTES.tours}?categoria=glaciares`, description: 'Perito Moreno y Campo de Hielo' },
      { label: 'Navegaciones', href: `${ROUTES.tours}?categoria=navegaciones`, description: 'Lago Argentino y sus brazos' },
      { label: 'Trekking y aventura', href: `${ROUTES.tours}?categoria=trekking-y-aventura`, description: 'Caminatas sobre hielo y senderos' },
      { label: 'Estancias y cultura', href: `${ROUTES.tours}?categoria=estancias-y-cultura`, description: 'Días de campo y museos' },
    ],
  },
  {
    label: 'Traslados',
    href: ROUTES.transfers,
    children: [
      { label: 'Todos los traslados', href: ROUTES.transfers },
      { label: 'Aeropuerto El Calafate', href: `${ROUTES.transfers}?categoria=traslados-aeropuerto`, description: 'Desde y hacia FTE' },
      { label: 'El Calafate ↔ El Chaltén', href: `${ROUTES.transfers}?categoria=traslados-interurbanos`, description: 'Conexión por Ruta 40' },
    ],
  },
  {
    label: 'Hoteles',
    href: ROUTES.hotels,
    children: [
      { label: 'Guía de alojamientos', href: ROUTES.hotels },
      { label: 'Restaurantes', href: ROUTES.restaurants, description: 'Dónde comer en El Calafate' },
      { label: 'Servicios', href: ROUTES.services, description: 'Alquiler de autos, equipamiento y más' },
      { label: 'Registrar mi establecimiento', href: ROUTES.hotelRegister, description: 'Sumate a la guía' },
    ],
  },
  {
    label: 'Qué hacer',
    href: ROUTES.destinations,
    children: [
      { label: 'Destinos', href: ROUTES.destinations, description: 'El Calafate, Perito Moreno, El Chaltén' },
      { label: 'Glaciar Perito Moreno', href: ROUTES.destination('glaciar-perito-moreno') },
      { label: 'Parque Nacional Los Glaciares', href: ROUTES.destination('parque-nacional-los-glaciares') },
      { label: 'El Chaltén', href: ROUTES.destination('el-chalten') },
    ],
  },
  {
    label: 'Guía de viaje',
    href: ROUTES.blog,
    children: [
      { label: 'Todos los artículos', href: ROUTES.blog },
      { label: 'Qué hacer en El Calafate', href: ROUTES.blogPost('que-hacer-en-el-calafate') },
      { label: 'Cuántos días quedarse', href: ROUTES.blogPost('cuantos-dias-en-el-calafate') },
      { label: 'Qué ropa llevar', href: ROUTES.blogPost('que-ropa-llevar-a-el-calafate') },
      { label: 'Preguntas frecuentes', href: ROUTES.faq },
    ],
  },
]

export const FOOTER_NAV = [
  {
    title: 'Excursiones',
    links: [
      { label: 'Glaciar Perito Moreno', href: ROUTES.tour('glaciar-perito-moreno-pasarelas') },
      { label: 'Minitrekking sobre el hielo', href: ROUTES.tour('minitrekking-perito-moreno') },
      { label: 'Navegación Todo Glaciares', href: ROUTES.tour('navegacion-todo-glaciares') },
      { label: 'El Chaltén en el día', href: ROUTES.tour('el-chalten-dia-completo') },
      { label: 'Ver todas', href: ROUTES.tours },
    ],
  },
  {
    title: 'Traslados',
    links: [
      { label: 'Aeropuerto ↔ El Calafate', href: ROUTES.tour('traslado-aeropuerto-el-calafate') },
      { label: 'El Calafate ↔ El Chaltén', href: ROUTES.tour('traslado-el-calafate-el-chalten') },
      { label: 'Ver todos', href: ROUTES.transfers },
    ],
  },
  {
    title: 'Guía de viaje',
    links: [
      { label: 'Qué hacer en El Calafate', href: ROUTES.blogPost('que-hacer-en-el-calafate') },
      { label: 'Cómo visitar el Perito Moreno', href: ROUTES.blogPost('como-visitar-el-glaciar-perito-moreno') },
      { label: 'Cómo llegar a El Calafate', href: ROUTES.blogPost('como-llegar-a-el-calafate') },
      { label: 'Mejor época para visitar', href: ROUTES.blogPost('mejor-epoca-para-visitar-el-calafate') },
      { label: 'Blog completo', href: ROUTES.blog },
    ],
  },
  {
    title: 'Vamos Calafate',
    links: [
      { label: 'Contacto', href: ROUTES.contact },
      { label: 'Preguntas frecuentes', href: ROUTES.faq },
      { label: 'Registrar mi hotel', href: ROUTES.hotelRegister },
      { label: 'Términos y condiciones', href: ROUTES.terms },
      { label: 'Política de privacidad', href: ROUTES.privacy },
      { label: 'Política de cancelación', href: ROUTES.cancellation },
    ],
  },
]
