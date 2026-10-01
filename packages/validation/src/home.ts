import { z } from 'zod'

/**
 * Homepage configuration, stored as the `home.config` site setting and
 * edited in the admin's "Página de inicio" screen.
 *
 * One document describes the whole page: which sections show, in what order,
 * and every text, button, image and item inside them. DEFAULT_HOME_CONFIG is
 * the homepage as designed, so a site with no saved configuration renders
 * exactly that, and `resolveHomeConfig` fills any field a stored document
 * lacks (e.g. a section added after it was saved) from the defaults.
 *
 * Images are media-library ids. An empty id means "use the automatic image"
 * (a tour's or destination's own cover), so a slide never renders blank.
 */

const text = (max: number) => z.string().trim().max(max)
const optionalId = z.string().trim().max(80).default('')
/** Internal paths ("/excursiones") or absolute https URLs. */
const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || v.startsWith('/') || /^https:\/\//.test(v), {
    message: 'Usá una ruta interna (/excursiones) o una URL https://',
  })

const buttonSchema = z.object({ label: text(60), href })

export const HOME_SECTION_IDS = [
  'search',
  'catalogue',
  'categories',
  'spotlight',
  'destinations',
  'facts',
  'seasons',
  'gallery',
  'reviews',
  'why',
  'guide',
  'hotels',
  'cta',
] as const
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number]

const headingSchema = z.object({
  eyebrow: text(80),
  title: text(140),
  description: text(400),
})

export const heroSlideSchema = z.object({
  enabled: z.boolean(),
  /** Short label on the progress tab. */
  tabLabel: text(40),
  eyebrow: text(80),
  title: text(120),
  description: text(300),
  primary: buttonSchema,
  secondary: buttonSchema,
  imageId: optionalId,
  /** Automatic image when imageId is empty: a tour or destination cover. */
  imageFrom: z.object({ kind: z.enum(['tour', 'destination']), slug: text(120) }),
})

export const homeConfigSchema = z.object({
  hero: z.object({
    /** Seconds each slide stays on screen. */
    autoplaySeconds: z.number().int().min(3).max(30),
    slides: z.array(heroSlideSchema).min(1, 'El hero necesita al menos una diapositiva').max(8),
  }),

  /** Display order; every id appears exactly once. */
  order: z.array(z.enum(HOME_SECTION_IDS)),

  sections: z.object({
    search: z.object({ enabled: z.boolean() }),

    catalogue: z.object({
      enabled: z.boolean(),
      heading: headingSchema,
      /** Tour slugs in display order; empty = all published, by catalogue order. */
      tourSlugs: z.array(text(120)).max(40),
      /** Tours shown before the "3 imperdibles" banner. */
      tilesBeforeBanner: z.number().int().min(0).max(12),
      banner: z.object({
        enabled: z.boolean(),
        badge: text(40),
        headlineFront: text(80),
        headlineBack: text(80),
        body: text(400),
        cta: buttonSchema,
        tourSlugs: z.array(text(120)).length(3),
      }),
      closingCard: z.object({
        enabled: z.boolean(),
        eyebrow: text(60),
        title: text(120),
        body: text(300),
        primary: buttonSchema,
        secondary: buttonSchema,
      }),
    }),

    categories: z.object({ enabled: z.boolean(), heading: headingSchema }),

    spotlight: z.object({
      enabled: z.boolean(),
      tourSlug: text(120),
      eyebrow: text(80),
      ctaLabel: text(60),
    }),

    destinations: z.object({ enabled: z.boolean(), heading: headingSchema }),

    facts: z.object({
      enabled: z.boolean(),
      eyebrow: text(80),
      title: text(160),
      imageId: optionalId,
      items: z.array(z.object({ value: text(20), label: text(120) })).min(1).max(6),
    }),

    seasons: z.object({
      enabled: z.boolean(),
      heading: headingSchema,
      items: z
        .array(
          z.object({
            id: z.enum(['verano', 'otono', 'invierno', 'primavera']),
            name: text(30),
            months: text(30),
            daylight: text(30),
            temperature: text(30),
            description: text(600),
            goodFor: z.array(text(40)).max(6),
            imageId: optionalId,
            imageFrom: text(120),
          }),
        )
        .length(4),
    }),

    gallery: z.object({ enabled: z.boolean(), heading: headingSchema, maxPhotos: z.number().int().min(4).max(30) }),

    reviews: z.object({ enabled: z.boolean(), heading: headingSchema }),

    why: z.object({
      enabled: z.boolean(),
      heading: headingSchema,
      items: z
        .array(
          z.object({
            icon: z.enum(['compass', 'clock', 'shield', 'messages', 'star', 'heart', 'map', 'users']),
            title: text(60),
            description: text(240),
          }),
        )
        .min(1)
        .max(8),
    }),

    guide: z.object({ enabled: z.boolean(), heading: headingSchema, count: z.number().int().min(1).max(12) }),

    hotels: z.object({ enabled: z.boolean(), heading: headingSchema }),

    cta: z.object({
      enabled: z.boolean(),
      eyebrow: text(80),
      title: text(160),
      description: text(400),
      primary: buttonSchema,
      secondary: buttonSchema,
      imageId: optionalId,
    }),
  }),
})

export type HomeConfig = z.infer<typeof homeConfigSchema>
export type HeroSlideConfig = z.infer<typeof heroSlideSchema>

const heading = (eyebrow: string, title: string, description = '') => ({ eyebrow, title, description })

export const DEFAULT_HOME_CONFIG: HomeConfig = {
  hero: {
    autoplaySeconds: 7,
    slides: [
      {
        enabled: true,
        tabLabel: 'Perito Moreno',
        eyebrow: 'Parque Nacional Los Glaciares',
        title: 'Viví la Patagonia desde El Calafate',
        description:
          'Excursiones al Glaciar Perito Moreno, navegaciones por el Lago Argentino y trekking en El Chaltén, con reserva online.',
        primary: { label: 'Ver excursiones', href: '/excursiones' },
        secondary: { label: '3 imperdibles', href: '/tres-excursiones-imperdibles-en-el-calafate' },
        imageId: '',
        imageFrom: { kind: 'destination', slug: 'glaciar-perito-moreno' },
      },
      {
        enabled: true,
        tabLabel: 'Minitrekking',
        eyebrow: 'Trekking sobre hielo',
        title: 'Caminá sobre el glaciar',
        description:
          'Con crampones y guías de montaña, recorré la superficie del Perito Moreno entre grietas y sumideros de hielo azul.',
        primary: { label: 'Ver el minitrekking', href: '/excursiones/minitrekking-perito-moreno' },
        secondary: { label: 'Todas las excursiones', href: '/excursiones' },
        imageId: '',
        imageFrom: { kind: 'tour', slug: 'minitrekking-perito-moreno' },
      },
      {
        enabled: true,
        tabLabel: 'Todo Glaciares',
        eyebrow: 'Navegación lacustre',
        title: 'Navegá entre témpanos',
        description:
          'Los brazos del Lago Argentino llevan a frentes glaciares que solo se alcanzan por agua, como el Upsala y el Spegazzini.',
        primary: { label: 'Ver la navegación', href: '/excursiones/navegacion-todo-glaciares' },
        secondary: { label: 'Todas las excursiones', href: '/excursiones' },
        imageId: '',
        imageFrom: { kind: 'tour', slug: 'navegacion-todo-glaciares' },
      },
      {
        enabled: true,
        tabLabel: 'El Chaltén',
        eyebrow: 'Capital nacional del trekking',
        title: 'El Chaltén y el Fitz Roy',
        description:
          'A unas tres horas por la Ruta 40, los senderos más célebres de la Patagonia parten desde el mismo pueblo.',
        primary: { label: 'Trekking en El Chaltén', href: '/excursiones/el-chalten-trekking-libre' },
        secondary: { label: 'Todas las excursiones', href: '/excursiones' },
        imageId: '',
        imageFrom: { kind: 'tour', slug: 'el-chalten-trekking-libre' },
      },
      {
        enabled: true,
        tabLabel: 'Torres del Paine',
        eyebrow: 'Día completo en Chile',
        title: 'Torres del Paine',
        description:
          'Miradores, el Salto Grande y los Cuernos del Paine en un circuito de día completo desde El Calafate.',
        primary: { label: 'Ver la excursión', href: '/excursiones/torres-del-paine' },
        secondary: { label: 'Todas las excursiones', href: '/excursiones' },
        imageId: '',
        imageFrom: { kind: 'tour', slug: 'torres-del-paine' },
      },
    ],
  },

  order: [...HOME_SECTION_IDS],

  sections: {
    search: { enabled: true },

    catalogue: {
      enabled: true,
      heading: heading(
        'Nuestras excursiones',
        'Excursiones desde El Calafate',
        'Glaciares, navegaciones, trekking y aventura: todo lo que podés reservar online.',
      ),
      tourSlugs: [],
      tilesBeforeBanner: 3,
      banner: {
        enabled: true,
        badge: 'Bonificación especial',
        headlineFront: '3 imperdibles en El Calafate',
        headlineBack: '¡No podés perderte estos tours!',
        body:
          'El Glaciar Perito Moreno, la Navegación Todo Glaciares y El Chaltén: las tres excursiones que definen un viaje a la Patagonia. Contratando las tres accedés a importantes bonificaciones.',
        cta: { label: 'Ver los 3 imperdibles', href: '/tres-excursiones-imperdibles-en-el-calafate' },
        tourSlugs: ['glaciar-perito-moreno-pasarelas', 'navegacion-todo-glaciares', 'el-chalten-trekking-libre'],
      },
      closingCard: {
        enabled: true,
        eyebrow: '¿Armamos tu viaje?',
        title: 'Combinamos excursiones según tus días en El Calafate',
        body: 'Contanos cuántos días tenés y qué te gustaría hacer: te armamos el itinerario y te pasamos las bonificaciones disponibles.',
        primary: { label: 'Escribinos', href: '/contacto' },
        secondary: { label: 'Ver los 3 imperdibles', href: '/tres-excursiones-imperdibles-en-el-calafate' },
      },
    },

    categories: {
      enabled: true,
      heading: heading(
        'Explorá por tipo de experiencia',
        'Elegí cómo querés conocer la región',
        'Hielo, agua, montaña o estepa: cada forma de recorrer Los Glaciares cuenta otra historia.',
      ),
    },

    spotlight: {
      enabled: true,
      tourSlug: 'minitrekking-perito-moreno',
      eyebrow: 'Experiencia imperdible',
      ctaLabel: 'Ver fechas y reservar',
    },

    destinations: {
      enabled: true,
      heading: heading('Destinos', 'La región, explicada', 'Qué es cada lugar, cómo se llega y qué se puede hacer allí.'),
    },

    facts: {
      enabled: true,
      eyebrow: 'Parque Nacional Los Glaciares',
      title: 'Uno de los paisajes de hielo más impresionantes del planeta',
      imageId: '',
      items: [
        { value: '1981', label: 'Patrimonio de la Humanidad por la UNESCO' },
        { value: '≈ 5 km', label: 'de ancho tiene el frente del Perito Moreno' },
        { value: '≈ 60 m', label: 'de altura sobre el agua alcanzan sus paredes' },
        { value: '+1.400 km²', label: 'de superficie tiene el Lago Argentino, el mayor del país' },
      ],
    },

    seasons: {
      enabled: true,
      heading: heading(
        'Cuándo viajar',
        'Cada estación, otra Patagonia',
        'El Calafate se visita todo el año. Esto es lo que cambia según cuándo vengas.',
      ),
      items: [
        {
          id: 'verano',
          name: 'Verano',
          months: 'Dic – Feb',
          daylight: 'hasta ~17 h',
          temperature: '5 a 20 °C',
          description:
            'La temporada alta. Los días larguísimos permiten combinar glaciar y navegación en una misma jornada, y todos los servicios funcionan a pleno. Es también la época de más viento y de mayor demanda: conviene reservar con anticipación.',
          goodFor: ['Navegaciones', 'Minitrekking', 'Trekking en El Chaltén', 'Días largos'],
          imageId: '',
          imageFrom: 'glaciar-perito-moreno',
        },
        {
          id: 'otono',
          name: 'Otoño',
          months: 'Mar – May',
          daylight: '10 a 13 h',
          temperature: '0 a 14 °C',
          description:
            'Los bosques de lenga se tiñen de rojo y naranja, el viento suele calmarse y hay menos visitantes. Para muchos, la época más fotogénica del año.',
          goodFor: ['Fotografía', 'Bosques de lenga', 'Menos gente', 'Pasarelas'],
          imageId: '',
          imageFrom: 'parque-nacional-los-glaciares',
        },
        {
          id: 'invierno',
          name: 'Invierno',
          months: 'Jun – Ago',
          daylight: '~8 h',
          temperature: '-5 a 5 °C',
          description:
            'Paisajes nevados y silencio. El Glaciar Perito Moreno se visita todo el año desde las pasarelas, aunque algunas excursiones reducen su frecuencia o hacen pausa. Ideal para un viaje tranquilo.',
          goodFor: ['Paisajes nevados', 'Pasarelas', 'Viaje tranquilo'],
          imageId: '',
          imageFrom: 'el-chalten',
        },
        {
          id: 'primavera',
          name: 'Primavera',
          months: 'Sep – Nov',
          daylight: '12 a 16 h',
          temperature: '2 a 15 °C',
          description:
            'Los días se alargan, la estepa florece y regresan las aves a la Laguna Nimez. Las excursiones retoman su ritmo completo antes de la temporada alta.',
          goodFor: ['Avistaje de aves', 'Estepa en flor', 'Temporada media'],
          imageId: '',
          imageFrom: 'lago-argentino',
        },
      ],
    },

    gallery: { enabled: true, heading: heading('Galería', 'La Patagonia austral en imágenes'), maxPhotos: 16 },

    reviews: { enabled: true, heading: heading('Opiniones', 'Lo que cuentan quienes ya viajaron') },

    why: {
      enabled: true,
      heading: heading('Por qué reservar acá', 'Reservá con información clara, antes de viajar'),
      items: [
        {
          icon: 'compass',
          title: 'Información verificable',
          description:
            'Distancias, accesos y condiciones de cada actividad, sin promesas que el clima patagónico no puede sostener.',
        },
        {
          icon: 'clock',
          title: 'Disponibilidad real',
          description: 'Los lugares que ves son los que hay. La reserva confirma sobre cupo real, no sobre una estimación.',
        },
        {
          icon: 'shield',
          title: 'Pago seguro',
          description: 'Procesado por plataformas de pago establecidas. No almacenamos datos de tu tarjeta.',
        },
        {
          icon: 'messages',
          title: 'Respuesta directa',
          description: 'Consultas por correo o WhatsApp antes y después de reservar, con la referencia de tu reserva.',
        },
      ],
    },

    guide: {
      enabled: true,
      heading: heading(
        'Guía de viaje',
        'Todo lo que conviene saber antes de venir',
        'Cuántos días quedarse, cómo llegar, qué llevar y cómo organizar cada día.',
      ),
      count: 8,
    },

    hotels: {
      enabled: true,
      heading: heading('Guía local', 'Dónde dormir y dónde comer', 'Alojamientos, restaurantes y servicios de El Calafate.'),
    },

    cta: {
      enabled: true,
      eyebrow: 'Empezá a planificar',
      title: 'Tu viaje a El Calafate, resuelto antes de llegar',
      description:
        'Elegí la excursión, seleccioná la fecha y reservá online. Si tenés dudas, escribinos: respondemos antes de que pagues.',
      primary: { label: 'Ver excursiones', href: '/excursiones' },
      secondary: { label: 'Hacer una consulta', href: '/contacto' },
      imageId: '',
    },
  },
}

/** Deep-merges `stored` over `base`; arrays are taken whole from `stored`. */
function merge<T>(base: T, stored: unknown): T {
  if (stored === undefined || stored === null) return base
  if (Array.isArray(base)) return (Array.isArray(stored) ? stored : base) as T
  if (typeof base === 'object' && base !== null) {
    if (typeof stored !== 'object' || Array.isArray(stored)) return base
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
    for (const key of Object.keys(base as Record<string, unknown>)) {
      out[key] = merge((base as Record<string, unknown>)[key], (stored as Record<string, unknown>)[key])
    }
    return out as T
  }
  return (typeof stored === typeof base ? stored : base) as T
}

/**
 * The configuration the homepage renders: the stored document merged over
 * the defaults and validated. Anything invalid falls back to the defaults
 * rather than breaking the homepage.
 */
export function resolveHomeConfig(stored: unknown): HomeConfig {
  const merged = merge(DEFAULT_HOME_CONFIG, stored)
  // Every section exactly once: drop unknowns and duplicates, append new ones.
  const seen = new Set<HomeSectionId>()
  const order = merged.order.filter(
    (id): id is HomeSectionId => (HOME_SECTION_IDS as readonly string[]).includes(id) && !seen.has(id) && !!seen.add(id),
  )
  for (const id of HOME_SECTION_IDS) if (!seen.has(id)) order.push(id)
  const parsed = homeConfigSchema.safeParse({ ...merged, order })
  return parsed.success ? parsed.data : DEFAULT_HOME_CONFIG
}

export const HOME_CONFIG_KEY = 'home.config'
