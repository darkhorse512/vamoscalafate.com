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
      { label: 'Glaciar Perito Moreno', href: ROUTES.tour('glaciar-perito-moreno-pasarelas'), description: 'Pasarelas y miradores' },
      { label: 'Minitrekking', href: ROUTES.tour('minitrekking-perito-moreno'), description: 'Caminata sobre el hielo' },
      { label: 'El Chaltén', href: `${ROUTES.tours}?categoria=trekking-y-aventura`, description: 'Trekking libre y Laguna de los Tres' },
      { label: 'Torres del Paine', href: ROUTES.tour('torres-del-paine'), description: 'Día completo en Chile' },
      { label: 'Cerro Frías', href: ROUTES.tour('aventuras-cerro-frias'), description: 'Cabalgata, tirolesa, 4x4 o trekking' },
      { label: '3 imperdibles', href: ROUTES.mustSee, description: 'Lo que no te podés perder' },
    ],
  },
  {
    label: 'Navegaciones',
    href: `${ROUTES.tours}?categoria=navegaciones`,
    children: [
      { label: 'Todas las navegaciones', href: `${ROUTES.tours}?categoria=navegaciones` },
      { label: 'Todo Glaciares', href: ROUTES.tour('navegacion-todo-glaciares'), description: 'Upsala y Spegazzini' },
      { label: 'Safari Náutico', href: ROUTES.tour('safari-nautico-perito-moreno'), description: 'Una hora frente al Perito Moreno' },
      { label: 'Safari Azul', href: ROUTES.tour('safari-azul'), description: 'Tocá el glaciar' },
      { label: 'Glaciares Gourmet', href: ROUTES.tour('glaciares-gourmet'), description: 'Navegación con vianda gourmet' },
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
      { label: 'El Chaltén trekking libre', href: ROUTES.tour('el-chalten-trekking-libre') },
      { label: 'Laguna de los Tres', href: ROUTES.tour('trekking-laguna-de-los-tres') },
      { label: 'Torres del Paine', href: ROUTES.tour('torres-del-paine') },
      { label: 'Cerro Frías', href: ROUTES.tour('aventuras-cerro-frias') },
    ],
  },
  {
    title: 'Navegaciones',
    links: [
      { label: 'Todo Glaciares', href: ROUTES.tour('navegacion-todo-glaciares') },
      { label: 'Safari Náutico', href: ROUTES.tour('safari-nautico-perito-moreno') },
      { label: 'Safari Azul', href: ROUTES.tour('safari-azul') },
      { label: 'Glaciares Gourmet', href: ROUTES.tour('glaciares-gourmet') },
      { label: '3 excursiones imperdibles', href: ROUTES.mustSee },
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
