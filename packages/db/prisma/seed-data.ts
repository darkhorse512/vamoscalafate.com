/**
 * ════════════════════════════════════════════════════════════════════════════
 * DEMO / INITIAL CONTENT
 *
 * Every row created from this file is written with `isDemo: true`.
 *
 * The excursion types below are real categories of activity offered in El
 * Calafate, and the geographic facts (distances, park names, lake names) are
 * publicly verifiable. Everything commercially specific — PRICES, DEPARTURE
 * TIMES, CAPACITIES, INCLUSIONS — is PLACEHOLDER DATA to make the platform
 * usable on day one. Replace it with real operator data before selling.
 *
 * Deliberately NOT seeded: customer reviews, ratings, awards, certifications
 * and testimonials. Fabricating social proof would be dishonest to travellers
 * and a legal risk. Reviews only ever enter through real submissions.
 * ════════════════════════════════════════════════════════════════════════════
 */

export const DEMO_NOTICE =
  'Contenido de demostración. Precios y horarios son de ejemplo y deben reemplazarse por datos comerciales reales.'

export type SeedTourOption = {
  name: string
  description: string
  /** Major units (ARS). Converted to cents on insert. PLACEHOLDER VALUES. */
  price: number
  childPrice?: number
  durationMinutes: number
  capacity: number
  minParticipants?: number
  maxParticipants: number
  pickupIncluded: boolean
  departureTimes: string[]
  freeCancellationHours: number
}

export type SeedTour = {
  slug: string
  name: string
  summary: string
  description: string
  categorySlug: string
  destinationSlug: string | null
  durationMinutes: number
  difficulty: 'EASY' | 'MODERATE' | 'CHALLENGING'
  location: string
  minAge?: number
  maxGroupSize?: number
  highlights: string[]
  included: string[]
  excluded: string[]
  importantInfo: string
  cancellationPolicy: string
  featured: boolean
  options: SeedTourOption[]
  itinerary: { title: string; description: string; timeLabel?: string }[]
  pickupLocations: { name: string; offsetMinutes: number; extraCost?: number }[]
  faqs: { question: string; answer: string }[]
  relatedSlugs: string[]
}

const STANDARD_CANCELLATION = `Cancelación sin cargo hasta 24 horas antes de la salida. Entre 24 y 12 horas antes, se retiene el 50% del valor. Con menos de 12 horas o en caso de no presentarse, no corresponde reintegro.

Si la excursión se cancela por condiciones climáticas o por decisión de la Administración de Parques Nacionales, se ofrece reprogramación o reintegro total.`

const PARK_FEE_NOTE =
  'La entrada al Parque Nacional Los Glaciares no está incluida y se abona en el acceso al parque. La tarifa la fija la Administración de Parques Nacionales y varía según residencia; consultá el valor vigente antes de viajar.'

const PATAGONIA_CLOTHING =
  'El clima en la zona cambia rápidamente durante el día. Recomendamos llevar campera rompeviento e impermeable, abrigo en capas, calzado cerrado con buen agarre, gorro, guantes, protector solar y anteojos de sol, incluso en verano.'

export const DESTINATIONS = [
  {
    slug: 'el-calafate',
    name: 'El Calafate',
    shortIntro:
      'La puerta de entrada al Parque Nacional Los Glaciares, a orillas del Lago Argentino, en el sur de la provincia de Santa Cruz.',
    description: `El Calafate es una localidad de la provincia de Santa Cruz, en la Patagonia argentina, ubicada sobre la margen sur del Lago Argentino. Es la base habitual para visitar el Parque Nacional Los Glaciares, declarado Patrimonio de la Humanidad por la UNESCO en 1981.

La ciudad concentra la oferta de alojamiento, gastronomía y servicios turísticos de la región. Desde aquí parten las excursiones al Glaciar Perito Moreno, las navegaciones por el Lago Argentino y los traslados hacia El Chaltén.

El Aeropuerto Internacional Comandante Armando Tola (FTE) se encuentra a unos 23 kilómetros del centro y conecta con Buenos Aires, Bariloche, Ushuaia y Córdoba, entre otros destinos.

**Cómo moverse.** El centro de El Calafate se recorre a pie: la avenida principal, Libertador, concentra comercios, restaurantes y agencias. Para llegar al Parque Nacional se requiere vehículo propio, transporte regular o una excursión contratada.

**Cuándo visitar.** La temporada alta va de noviembre a marzo, con días largos y temperaturas más templadas. El invierno ofrece menos afluencia de visitantes y paisajes nevados, aunque algunos servicios reducen su frecuencia.`,
    region: 'Santa Cruz',
    latitude: -50.3379,
    longitude: -72.2648,
    featured: true,
    attractions: [
      {
        slug: 'laguna-nimez',
        name: 'Reserva Natural Laguna Nimez',
        summary:
          'Reserva municipal de avifauna ubicada a pocas cuadras del centro, sobre la costa del Lago Argentino.',
        description:
          'La Reserva Natural Laguna Nimez es un área protegida municipal situada al norte del centro de El Calafate. Cuenta con senderos peatonales y miradores desde los que se observan flamencos australes, cisnes de cuello negro, macáes y otras especies de aves acuáticas. El recorrido completo es de baja dificultad y se realiza a pie.',
        openingInfo: 'Los horarios de acceso varían según la temporada. Consultá el horario vigente antes de ir.',
        entryFeeInfo: 'La reserva cobra una entrada fijada por el municipio.',
      },
      {
        slug: 'glaciarium',
        name: 'Glaciarium',
        summary: 'Centro de interpretación dedicado a la glaciología y al hielo patagónico.',
        description:
          'El Glaciarium es un museo de interpretación ubicado a pocos kilómetros de El Calafate, sobre la ruta al Parque Nacional. Sus salas explican la formación de los glaciares, la dinámica del Campo de Hielo Patagónico Sur y los efectos del cambio climático en la región.',
        openingInfo: 'Abre todo el año con horarios que varían según la temporada.',
        entryFeeInfo: 'Entrada paga, con tarifas diferenciadas.',
      },
    ],
  },
  {
    slug: 'glaciar-perito-moreno',
    name: 'Glaciar Perito Moreno',
    shortIntro:
      'Uno de los glaciares más visitados del Parque Nacional Los Glaciares, accesible por pasarelas peatonales.',
    description: `El Glaciar Perito Moreno se encuentra en el Parque Nacional Los Glaciares, a unos 80 kilómetros de El Calafate por la Ruta Provincial 11. Forma parte del Campo de Hielo Patagónico Sur y desemboca en el Brazo Rico y el Canal de los Témpanos del Lago Argentino.

Su frente tiene aproximadamente 5 kilómetros de ancho y una altura sobre el nivel del agua de alrededor de 60 metros. A diferencia de la mayoría de los glaciares del mundo, el Perito Moreno se ha mantenido en un balance relativamente estable durante las últimas décadas.

**Las pasarelas.** El área de pasarelas ofrece varios circuitos peatonales de distinta extensión y dificultad, con miradores a diferentes alturas frente al glaciar. Los recorridos están señalizados y buena parte es accesible.

**Los rupturas.** Periódicamente el avance del glaciar bloquea el Brazo Rico y forma un dique de hielo que termina colapsando. El fenómeno no tiene una periodicidad fija y no puede anticiparse con precisión.

**Desprendimientos.** Durante la visita es habitual escuchar y ver caer bloques de hielo del frente. Es un proceso natural y continuo, más frecuente en los días cálidos.`,
    region: 'Santa Cruz',
    latitude: -50.4967,
    longitude: -73.1377,
    featured: true,
    attractions: [
      {
        slug: 'pasarelas-perito-moreno',
        name: 'Pasarelas del Perito Moreno',
        summary: 'Red de circuitos peatonales con miradores frente al frente del glaciar.',
        description:
          'El área de pasarelas del Glaciar Perito Moreno está formada por varios circuitos de distinta extensión que recorren la Península de Magallanes. Ofrecen vistas del frente norte y sur del glaciar desde diferentes alturas. Los senderos son de material y cuentan con sectores accesibles.',
        openingInfo:
          'El acceso al Parque Nacional tiene horarios establecidos por la Administración de Parques Nacionales.',
        entryFeeInfo: 'Requiere el pago de la entrada al Parque Nacional Los Glaciares.',
      },
    ],
  },
  {
    slug: 'parque-nacional-los-glaciares',
    name: 'Parque Nacional Los Glaciares',
    shortIntro:
      'Área protegida de casi 727.000 hectáreas, declarada Patrimonio de la Humanidad por la UNESCO en 1981.',
    description: `El Parque Nacional Los Glaciares fue creado en 1937 y se extiende por el oeste de la provincia de Santa Cruz, sobre la frontera con Chile. Con una superficie cercana a las 727.000 hectáreas, es uno de los parques nacionales más extensos de la Argentina.

Fue declarado Patrimonio Natural de la Humanidad por la UNESCO en 1981. Protege una porción significativa del Campo de Hielo Patagónico Sur, la tercera extensión de hielo continental del planeta después de la Antártida y Groenlandia.

**Zona sur.** Con acceso desde El Calafate, incluye el Glaciar Perito Moreno, el Lago Argentino y los glaciares Upsala y Spegazzini, estos últimos accesibles únicamente por vía lacustre.

**Zona norte.** Con acceso desde El Chaltén, concentra el área de trekking en torno al Cerro Fitz Roy y el Cerro Torre, con senderos de acceso libre y sin costo.

La administración del parque establece las condiciones de acceso, las tarifas y las restricciones vigentes en cada temporada.`,
    region: 'Santa Cruz',
    latitude: -50.0,
    longitude: -73.2,
    featured: true,
    attractions: [],
  },
  {
    slug: 'el-chalten',
    name: 'El Chaltén',
    shortIntro:
      'Localidad de montaña al norte del parque, conocida como punto de partida de los trekkings al Fitz Roy.',
    description: `El Chaltén es una localidad de la provincia de Santa Cruz fundada en 1985, ubicada dentro del sector norte del Parque Nacional Los Glaciares, a unos 215 kilómetros de El Calafate por las rutas 40 y 23.

Es el punto de partida de una red de senderos de acceso libre que parten desde el pueblo, entre ellos los que conducen a la Laguna de los Tres, con vista al Cerro Fitz Roy, y a la Laguna Torre, frente al Cerro Torre.

Los senderos no requieren guía ni permiso previo y están señalizados. Las distancias y los desniveles varían: hay opciones de una hora y recorridos de jornada completa con desniveles exigentes.

Se puede visitar en el día desde El Calafate, aunque quienes quieran hacer los trekkings largos suelen alojarse al menos una noche en el pueblo.`,
    region: 'Santa Cruz',
    latitude: -49.3314,
    longitude: -72.8861,
    featured: false,
    attractions: [],
  },
  {
    slug: 'lago-argentino',
    name: 'Lago Argentino',
    shortIntro:
      'El lago de mayor superficie de la Argentina, sobre cuya costa sur se asienta El Calafate.',
    description: `El Lago Argentino es el lago de mayor superficie del país, con alrededor de 1.415 kilómetros cuadrados. Se ubica en el sudoeste de la provincia de Santa Cruz, dentro y en el entorno del Parque Nacional Los Glaciares.

Recibe el aporte de varios glaciares del Campo de Hielo Patagónico Sur, entre ellos el Perito Moreno, el Upsala y el Spegazzini. Ese origen glaciario le da su característico color turquesa, producto de las partículas minerales en suspensión conocidas como harina glaciar.

Sus brazos —el Brazo Norte, el Brazo Rico y el Canal de los Témpanos— son el escenario de las navegaciones que permiten acceder a los glaciares que no tienen acceso terrestre.

El río Santa Cruz nace en este lago y desemboca en el océano Atlántico.`,
    region: 'Santa Cruz',
    latitude: -50.2,
    longitude: -72.5,
    featured: false,
    attractions: [],
  },
] as const

export const TOUR_CATEGORIES = [
  {
    slug: 'glaciares',
    name: 'Glaciares',
    channel: 'excursiones',
    description:
      'Excursiones al Glaciar Perito Moreno y a los glaciares del Campo de Hielo Patagónico Sur.',
    sortOrder: 1,
  },
  {
    slug: 'navegaciones',
    name: 'Navegaciones',
    channel: 'excursiones',
    description: 'Salidas lacustres por el Lago Argentino y sus brazos.',
    sortOrder: 2,
  },
  {
    slug: 'trekking-y-aventura',
    name: 'Trekking y aventura',
    channel: 'excursiones',
    description: 'Caminatas sobre hielo, senderismo y actividades al aire libre.',
    sortOrder: 3,
  },
  {
    slug: 'estancias-y-cultura',
    name: 'Estancias y cultura',
    channel: 'excursiones',
    description: 'Jornadas en estancias patagónicas y visitas culturales.',
    sortOrder: 4,
  },
  {
    slug: 'excursiones-de-dia-completo',
    name: 'Día completo',
    channel: 'excursiones',
    description: 'Salidas de jornada completa desde El Calafate.',
    sortOrder: 5,
  },
  {
    slug: 'traslados-aeropuerto',
    name: 'Traslados aeropuerto',
    channel: 'traslados',
    description: 'Traslados entre el Aeropuerto Comandante Armando Tola y El Calafate.',
    sortOrder: 1,
  },
  {
    slug: 'traslados-interurbanos',
    name: 'Traslados interurbanos',
    channel: 'traslados',
    description: 'Conexiones entre El Calafate, El Chaltén y otros destinos de la región.',
    sortOrder: 2,
  },
] as const

export const BLOG_CATEGORIES = [
  { slug: 'el-calafate', name: 'El Calafate', description: 'Guías y novedades de la ciudad.' },
  { slug: 'perito-moreno', name: 'Perito Moreno', description: 'Todo sobre el glaciar y su visita.' },
  { slug: 'patagonia', name: 'Patagonia', description: 'La región, sus rutas y sus paisajes.' },
  { slug: 'excursiones', name: 'Excursiones', description: 'Qué esperar de cada salida.' },
  { slug: 'traslados', name: 'Traslados', description: 'Cómo moverse por la región.' },
  { slug: 'hoteles', name: 'Hoteles', description: 'Dónde alojarse.' },
  { slug: 'gastronomia', name: 'Gastronomía', description: 'Qué y dónde comer.' },
  { slug: 'consejos-de-viaje', name: 'Consejos de viaje', description: 'Preparativos y logística.' },
  { slug: 'aventura', name: 'Aventura', description: 'Actividades al aire libre.' },
] as const

export const BLOG_TAGS = [
  'perito-moreno',
  'el-calafate',
  'patagonia',
  'trekking',
  'navegacion',
  'transporte',
  'presupuesto',
  'primera-vez',
  'itinerarios',
  'clima',
] as const

export const HOTEL_AMENITIES = [
  { key: 'wifi', name: 'WiFi', icon: 'wifi' },
  { key: 'desayuno', name: 'Desayuno incluido', icon: 'coffee' },
  { key: 'estacionamiento', name: 'Estacionamiento', icon: 'car' },
  { key: 'calefaccion', name: 'Calefacción', icon: 'flame' },
  { key: 'restaurante', name: 'Restaurante', icon: 'utensils' },
  { key: 'traslado-aeropuerto', name: 'Traslado al aeropuerto', icon: 'plane' },
  { key: 'vista-al-lago', name: 'Vista al lago', icon: 'mountain' },
  { key: 'spa', name: 'Spa', icon: 'waves' },
  { key: 'accesibilidad', name: 'Accesibilidad', icon: 'accessibility' },
  { key: 'admite-mascotas', name: 'Admite mascotas', icon: 'dog' },
  { key: 'lavanderia', name: 'Lavandería', icon: 'shirt' },
  { key: 'guarda-equipaje', name: 'Guarda equipaje', icon: 'luggage' },
] as const

export const BUSINESS_CATEGORIES = [
  { slug: 'restaurantes', name: 'Restaurantes', channel: 'restaurantes', icon: 'utensils', sortOrder: 1 },
  { slug: 'cafeterias', name: 'Cafeterías', channel: 'restaurantes', icon: 'coffee', sortOrder: 2 },
  { slug: 'alquiler-de-autos', name: 'Alquiler de autos', channel: 'servicios', icon: 'car', sortOrder: 1 },
  { slug: 'equipamiento-outdoor', name: 'Equipamiento outdoor', channel: 'servicios', icon: 'backpack', sortOrder: 2 },
  { slug: 'agencias-y-guias', name: 'Agencias y guías', channel: 'servicios', icon: 'map', sortOrder: 3 },
] as const

export const TOURS: SeedTour[] = [
  {
    slug: 'glaciar-perito-moreno-pasarelas',
    name: 'Glaciar Perito Moreno — Pasarelas',
    summary:
      'Excursión clásica de día completo al Glaciar Perito Moreno con tiempo libre en el circuito de pasarelas.',
    description: `La excursión clásica al Glaciar Perito Moreno recorre los 80 kilómetros que separan El Calafate del área de pasarelas, dentro del Parque Nacional Los Glaciares.

El trayecto por la Ruta Provincial 11 bordea el Lago Argentino y atraviesa la estepa patagónica, con paradas en miradores panorámicos antes de ingresar al parque.

Una vez en la Península de Magallanes, dispondrás de varias horas para recorrer los circuitos de pasarelas a tu ritmo. Los senderos ofrecen vistas del frente norte y sur del glaciar desde distintas alturas, y están conectados por escaleras y rampas.

Es habitual presenciar desprendimientos de bloques de hielo desde el frente del glaciar, un proceso natural que ocurre con mayor frecuencia en los días cálidos.`,
    categorySlug: 'glaciares',
    destinationSlug: 'glaciar-perito-moreno',
    durationMinutes: 540,
    difficulty: 'EASY',
    location: 'Parque Nacional Los Glaciares',
    maxGroupSize: 45,
    highlights: [
      'Vista frontal del Glaciar Perito Moreno desde las pasarelas',
      'Recorrido panorámico por la Ruta Provincial 11',
      'Tiempo libre para recorrer los circuitos a tu ritmo',
      'Guía acompañante durante todo el recorrido',
    ],
    included: [
      'Traslado ida y vuelta desde El Calafate',
      'Guía acompañante bilingüe (español / inglés)',
      'Tiempo libre en el área de pasarelas',
    ],
    excluded: [
      'Entrada al Parque Nacional Los Glaciares',
      'Almuerzo y bebidas',
      'Navegación Safari Náutico (opcional, se abona en el lugar)',
    ],
    importantInfo: `${PARK_FEE_NOTE}\n\n${PATAGONIA_CLOTHING}\n\nEl circuito de pasarelas incluye escaleras. Existe un sector accesible para personas con movilidad reducida.`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: true,
    options: [
      {
        name: 'Regular en bus',
        description: 'Traslado compartido en bus con guía acompañante.',
        price: 85000,
        childPrice: 55000,
        durationMinutes: 540,
        capacity: 45,
        maxParticipants: 45,
        pickupIncluded: true,
        departureTimes: ['07:30', '13:00'],
        freeCancellationHours: 24,
      },
      {
        name: 'Premium en minibús',
        description: 'Grupo reducido en minibús, con más tiempo en el área de pasarelas.',
        price: 135000,
        childPrice: 95000,
        durationMinutes: 540,
        capacity: 16,
        maxParticipants: 16,
        pickupIncluded: true,
        departureTimes: ['08:00'],
        freeCancellationHours: 24,
      },
      {
        name: 'Privada',
        description: 'Vehículo y guía exclusivos, con horario de salida flexible.',
        price: 480000,
        durationMinutes: 540,
        capacity: 6,
        minParticipants: 1,
        maxParticipants: 6,
        pickupIncluded: true,
        departureTimes: [],
        freeCancellationHours: 48,
      },
    ],
    itinerary: [
      { title: 'Salida desde El Calafate', description: 'Pasamos a buscarte por tu alojamiento en el centro de El Calafate.', timeLabel: '07:30' },
      { title: 'Ruta 11 y miradores', description: 'Recorrido por la Ruta Provincial 11 bordeando el Lago Argentino, con parada en miradores panorámicos.', timeLabel: '08:00' },
      { title: 'Ingreso al Parque Nacional', description: 'Registro y pago de la entrada al Parque Nacional Los Glaciares en el acceso.', timeLabel: '09:15' },
      { title: 'Pasarelas del Perito Moreno', description: 'Tiempo libre para recorrer los circuitos de pasarelas y los miradores frente al glaciar.', timeLabel: '09:45' },
      { title: 'Regreso a El Calafate', description: 'Salida del parque y regreso a la ciudad con llegada estimada a media tarde.', timeLabel: '15:30' },
    ],
    pickupLocations: [
      { name: 'Alojamientos del centro de El Calafate', offsetMinutes: -30 },
      { name: 'Terminal de Ómnibus', offsetMinutes: -20 },
      { name: 'Zona Bahía Redonda', offsetMinutes: -35 },
    ],
    faqs: [
      { question: '¿La entrada al parque está incluida?', answer: 'No. La entrada al Parque Nacional Los Glaciares se abona en el acceso al parque y su valor lo fija la Administración de Parques Nacionales. Varía según residencia y temporada.' },
      { question: '¿Cuánto tiempo se está frente al glaciar?', answer: 'La excursión contempla aproximadamente cuatro horas en el área de pasarelas, tiempo suficiente para recorrer los circuitos principales sin apuro.' },
      { question: '¿Es apta para personas con movilidad reducida?', answer: 'El área de pasarelas cuenta con un circuito accesible. Avisanos al reservar para coordinar el vehículo adecuado.' },
      { question: '¿Qué pasa si llueve o nieva?', answer: 'La excursión se realiza igualmente salvo que el parque cierre por condiciones de seguridad. En ese caso ofrecemos reprogramación o reintegro total.' },
    ],
    relatedSlugs: ['minitrekking-perito-moreno', 'navegacion-todo-glaciares', 'safari-nautico-perito-moreno'],
  },
  {
    slug: 'minitrekking-perito-moreno',
    name: 'Minitrekking sobre el Glaciar Perito Moreno',
    summary:
      'Caminata guiada con crampones sobre el hielo del Perito Moreno, combinada con navegación y pasarelas.',
    description: `El minitrekking combina la visita al área de pasarelas con una caminata guiada sobre la superficie del Glaciar Perito Moreno.

La jornada incluye una navegación corta por el Brazo Rico hasta la costa del glaciar. Desde allí, un equipo de guías de montaña coloca los crampones y conduce grupos reducidos por la superficie del hielo.

La caminata recorre formaciones características del glaciar: grietas, sumideros, lagunas superficiales y seracs. La duración efectiva sobre el hielo es de aproximadamente una hora y media.

La actividad la operan prestadores habilitados por la Administración de Parques Nacionales y está sujeta a restricciones de edad y condición física.`,
    categorySlug: 'trekking-y-aventura',
    destinationSlug: 'glaciar-perito-moreno',
    durationMinutes: 660,
    difficulty: 'MODERATE',
    location: 'Glaciar Perito Moreno',
    minAge: 10,
    maxGroupSize: 20,
    highlights: [
      'Caminata con crampones sobre el hielo del glaciar',
      'Navegación por el Brazo Rico hasta la costa del glaciar',
      'Guías de montaña habilitados, en grupos reducidos',
      'Visita al área de pasarelas incluida',
    ],
    included: [
      'Traslado desde El Calafate',
      'Navegación por el Brazo Rico',
      'Equipo de crampones y arnés',
      'Guías de montaña habilitados',
      'Tiempo en el área de pasarelas',
    ],
    excluded: ['Entrada al Parque Nacional Los Glaciares', 'Almuerzo (se recomienda llevar vianda)', 'Bebidas'],
    importantInfo: `Actividad con restricción de edad: se admite a partir de los 10 años y hasta los 65 años, según las condiciones del prestador habilitado. Requiere condición física acorde a una caminata sobre terreno irregular.\n\nEs obligatorio el uso de calzado de trekking cerrado con caña alta y buen agarre. No se admite calzado deportivo liviano.\n\n${PARK_FEE_NOTE}\n\n${PATAGONIA_CLOTHING}`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: true,
    options: [
      {
        name: 'Minitrekking clásico',
        description: 'Aproximadamente 1 hora 30 minutos de caminata sobre el hielo.',
        price: 260000,
        durationMinutes: 660,
        capacity: 20,
        maxParticipants: 20,
        pickupIncluded: true,
        departureTimes: ['07:00'],
        freeCancellationHours: 48,
      },
      {
        name: 'Big Ice',
        description: 'Travesía extendida sobre el glaciar, de mayor exigencia física.',
        price: 390000,
        durationMinutes: 720,
        capacity: 12,
        maxParticipants: 12,
        pickupIncluded: true,
        departureTimes: ['06:30'],
        freeCancellationHours: 48,
      },
    ],
    itinerary: [
      { title: 'Salida desde El Calafate', description: 'Retiro desde el alojamiento y traslado al Parque Nacional.', timeLabel: '07:00' },
      { title: 'Puerto Bajo de las Sombras', description: 'Embarque y navegación por el Brazo Rico hasta la costa del glaciar.', timeLabel: '09:30' },
      { title: 'Charla de seguridad y colocación de crampones', description: 'Los guías explican el uso del equipo y las normas de la caminata.', timeLabel: '10:15' },
      { title: 'Caminata sobre el hielo', description: 'Recorrido guiado por grietas, sumideros y lagunas del glaciar.', timeLabel: '10:45' },
      { title: 'Pasarelas', description: 'Regreso en navegación y tiempo en el circuito de pasarelas.', timeLabel: '13:30' },
      { title: 'Regreso', description: 'Retorno a El Calafate.', timeLabel: '16:30' },
    ],
    pickupLocations: [
      { name: 'Alojamientos del centro de El Calafate', offsetMinutes: -30 },
      { name: 'Terminal de Ómnibus', offsetMinutes: -20 },
    ],
    faqs: [
      { question: '¿Hay límite de edad?', answer: 'Sí. El minitrekking clásico admite personas de 10 a 65 años y el Big Ice de 18 a 50 años, según las condiciones establecidas por el prestador habilitado.' },
      { question: '¿Qué calzado necesito?', answer: 'Calzado de trekking cerrado, con caña alta y suela con buen agarre. Los crampones se ajustan sobre ese calzado y no se adaptan a zapatillas livianas.' },
      { question: '¿Se puede llevar almuerzo?', answer: 'Sí, y se recomienda: la jornada es larga y no hay servicio de comidas sobre el glaciar. Llevá vianda y agua.' },
    ],
    relatedSlugs: ['glaciar-perito-moreno-pasarelas', 'navegacion-todo-glaciares'],
  },
  {
    slug: 'navegacion-todo-glaciares',
    name: 'Navegación Todo Glaciares',
    summary:
      'Navegación de día completo por el Brazo Norte del Lago Argentino hasta los glaciares Upsala y Spegazzini.',
    description: `La navegación Todo Glaciares recorre el Brazo Norte del Lago Argentino, un sector del Parque Nacional Los Glaciares al que solo se accede por vía lacustre.

La embarcación parte de Puerto Punta Bandera, a unos 45 kilómetros de El Calafate, y navega entre témpanos desprendidos de los glaciares que alimentan el lago.

El recorrido se aproxima al frente del Glaciar Upsala, uno de los mayores del Campo de Hielo Patagónico Sur, y al Glaciar Spegazzini, que presenta el frente de mayor altura del parque.

Según las condiciones de navegación y la cantidad de témpanos, el capitán define el itinerario del día. Algunas salidas incluyen un descenso en la base Spegazzini con un sendero corto hasta un mirador.`,
    categorySlug: 'navegaciones',
    destinationSlug: 'lago-argentino',
    durationMinutes: 600,
    difficulty: 'EASY',
    location: 'Brazo Norte, Lago Argentino',
    maxGroupSize: 120,
    highlights: [
      'Frente del Glaciar Upsala',
      'Glaciar Spegazzini, el de mayor altura del parque',
      'Navegación entre témpanos del Lago Argentino',
      'Descenso en la base Spegazzini (según itinerario del día)',
    ],
    included: ['Traslado desde El Calafate a Puerto Punta Bandera', 'Navegación por el Brazo Norte', 'Guía a bordo'],
    excluded: ['Entrada al Parque Nacional Los Glaciares', 'Almuerzo y bebidas (servicio de cafetería a bordo)'],
    importantInfo: `El itinerario puede modificarse según las condiciones del lago, el viento y la acumulación de témpanos. La decisión es del capitán de la embarcación y responde a razones de seguridad.\n\n${PARK_FEE_NOTE}\n\n${PATAGONIA_CLOTHING} La cubierta exterior es el mejor punto de observación y suele estar expuesta al viento.`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: true,
    options: [
      {
        name: 'Clase turista',
        description: 'Butaca en salón general con acceso a cubiertas exteriores.',
        price: 195000,
        childPrice: 140000,
        durationMinutes: 600,
        capacity: 120,
        maxParticipants: 120,
        pickupIncluded: true,
        departureTimes: ['07:30'],
        freeCancellationHours: 48,
      },
      {
        name: 'Clase premium',
        description: 'Salón exclusivo en cubierta superior, con servicio de cafetería incluido.',
        price: 290000,
        childPrice: 210000,
        durationMinutes: 600,
        capacity: 40,
        maxParticipants: 40,
        pickupIncluded: true,
        departureTimes: ['07:30'],
        freeCancellationHours: 48,
      },
    ],
    itinerary: [
      { title: 'Traslado a Punta Bandera', description: 'Salida desde El Calafate hacia el puerto, a unos 45 km.', timeLabel: '07:30' },
      { title: 'Embarque', description: 'Registro y embarque en Puerto Punta Bandera.', timeLabel: '08:30' },
      { title: 'Canal Upsala', description: 'Navegación entre témpanos hacia el frente del Glaciar Upsala.', timeLabel: '10:00' },
      { title: 'Glaciar Spegazzini', description: 'Aproximación al frente del Spegazzini y, según itinerario, descenso en la base.', timeLabel: '12:30' },
      { title: 'Regreso', description: 'Retorno a Punta Bandera y traslado a El Calafate.', timeLabel: '16:00' },
    ],
    pickupLocations: [
      { name: 'Alojamientos del centro de El Calafate', offsetMinutes: -30 },
      { name: 'Terminal de Ómnibus', offsetMinutes: -25 },
    ],
    faqs: [
      { question: '¿Se puede bajar a caminar?', answer: 'Algunas salidas incluyen un descenso en la base Spegazzini con un sendero corto hasta un mirador. Depende del itinerario del día y de las condiciones de navegación.' },
      { question: '¿Hay servicio de comida a bordo?', answer: 'La embarcación cuenta con cafetería. El almuerzo no está incluido; podés llevar vianda o comprar a bordo.' },
      { question: '¿Es una excursión apta para chicos?', answer: 'Sí. No tiene restricción de edad y el recorrido se hace íntegramente a bordo.' },
    ],
    relatedSlugs: ['glaciar-perito-moreno-pasarelas', 'safari-nautico-perito-moreno'],
  },
  {
    slug: 'safari-nautico-perito-moreno',
    name: 'Safari Náutico frente al Perito Moreno',
    summary:
      'Navegación corta por el Canal de los Témpanos para ver el frente sur del glaciar desde el agua.',
    description: `El Safari Náutico es una navegación de aproximadamente una hora por el Canal de los Témpanos, frente a la pared sur del Glaciar Perito Moreno.

La embarcación parte del Puerto Bajo de las Sombras, dentro del Parque Nacional, y se aproxima al frente del glaciar respetando la distancia de seguridad establecida.

Desde el agua, la escala del frente —unos 60 metros sobre la superficie del lago— se percibe de forma distinta que desde las pasarelas. Es una actividad complementaria que suele combinarse con la visita al circuito peatonal.`,
    categorySlug: 'navegaciones',
    destinationSlug: 'glaciar-perito-moreno',
    durationMinutes: 60,
    difficulty: 'EASY',
    location: 'Canal de los Témpanos',
    maxGroupSize: 130,
    highlights: [
      'Vista del frente sur del glaciar desde el agua',
      'Navegación por el Canal de los Témpanos',
      'Complemento ideal de la visita a las pasarelas',
    ],
    included: ['Navegación de aproximadamente 1 hora', 'Guía a bordo'],
    excluded: [
      'Traslado hasta el Parque Nacional',
      'Entrada al Parque Nacional Los Glaciares',
      'Comidas y bebidas',
    ],
    importantInfo: `Esta actividad no incluye el traslado desde El Calafate: el embarque es en el Puerto Bajo de las Sombras, dentro del Parque Nacional. Podés combinarla con la excursión de pasarelas o llegar por tus propios medios.\n\nLas salidas dependen de las condiciones del lago y pueden suspenderse por viento.\n\n${PATAGONIA_CLOTHING}`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: false,
    options: [
      {
        name: 'Navegación 1 hora',
        description: 'Salida regular desde Puerto Bajo de las Sombras.',
        price: 65000,
        childPrice: 45000,
        durationMinutes: 60,
        capacity: 130,
        maxParticipants: 130,
        pickupIncluded: false,
        departureTimes: ['10:30', '12:00', '13:30', '15:00'],
        freeCancellationHours: 24,
      },
    ],
    itinerary: [
      { title: 'Embarque', description: 'Presentación en el Puerto Bajo de las Sombras 20 minutos antes de la salida.', timeLabel: '-20 min' },
      { title: 'Navegación', description: 'Recorrido por el Canal de los Témpanos frente a la pared sur del glaciar.' },
      { title: 'Desembarque', description: 'Regreso al puerto.' },
    ],
    pickupLocations: [{ name: 'Puerto Bajo de las Sombras (punto de encuentro)', offsetMinutes: -20 }],
    faqs: [
      { question: '¿Incluye el traslado desde El Calafate?', answer: 'No. El embarque es dentro del Parque Nacional. Podés sumarla a la excursión de pasarelas o llegar por tus propios medios.' },
      { question: '¿Cuánto dura la navegación?', answer: 'Aproximadamente una hora, sujeta a las condiciones del lago.' },
    ],
    relatedSlugs: ['glaciar-perito-moreno-pasarelas', 'navegacion-todo-glaciares'],
  },
  {
    slug: 'el-chalten-dia-completo',
    name: 'El Chaltén — Día completo',
    summary:
      'Excursión de jornada completa a El Chaltén con tiempo libre para caminar los senderos del Fitz Roy.',
    description: `El Chaltén se encuentra a unos 215 kilómetros de El Calafate, en el sector norte del Parque Nacional Los Glaciares. La excursión de día completo permite conocerlo sin trasladar el alojamiento.

El trayecto recorre la Ruta 40 y la Ruta 23, bordeando el Lago Viedma, con paradas en miradores desde los que se ven el Cerro Fitz Roy y el Cerro Torre cuando las condiciones lo permiten.

En El Chaltén dispondrás de tiempo libre para hacer alguno de los senderos cortos que parten del pueblo —como el Mirador de los Cóndores o la Chorrillo del Salto— o para almorzar y recorrer la localidad.

Los senderos del Parque Nacional en este sector son de acceso libre y no requieren guía.`,
    categorySlug: 'excursiones-de-dia-completo',
    destinationSlug: 'el-chalten',
    durationMinutes: 780,
    difficulty: 'MODERATE',
    location: 'El Chaltén',
    maxGroupSize: 45,
    highlights: [
      'Vistas del Cerro Fitz Roy y el Cerro Torre',
      'Recorrido por la Ruta 40 y el Lago Viedma',
      'Tiempo libre para caminar senderos del parque',
      'Parada en miradores panorámicos',
    ],
    included: ['Traslado ida y vuelta desde El Calafate', 'Guía acompañante', 'Paradas en miradores'],
    excluded: ['Almuerzo y bebidas', 'Excursiones opcionales en El Chaltén'],
    importantInfo: `La jornada es larga: la salida es temprano y el regreso a El Calafate se produce por la noche.\n\nLa visibilidad del Fitz Roy y el Torre depende enteramente de las condiciones meteorológicas y no puede garantizarse.\n\nSi planeás hacer el trekking a Laguna de los Tres, tené en cuenta que requiere entre 8 y 10 horas y no es compatible con el horario de regreso de esta excursión.\n\n${PATAGONIA_CLOTHING}`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: true,
    options: [
      {
        name: 'Regular en bus',
        description: 'Traslado compartido con guía acompañante y tiempo libre en el pueblo.',
        price: 125000,
        childPrice: 85000,
        durationMinutes: 780,
        capacity: 45,
        maxParticipants: 45,
        pickupIncluded: true,
        departureTimes: ['06:00'],
        freeCancellationHours: 24,
      },
      {
        name: 'Con trekking guiado a Laguna Capri',
        description: 'Incluye caminata guiada de dificultad media hasta Laguna Capri.',
        price: 185000,
        durationMinutes: 780,
        capacity: 14,
        maxParticipants: 14,
        pickupIncluded: true,
        departureTimes: ['06:00'],
        freeCancellationHours: 48,
      },
    ],
    itinerary: [
      { title: 'Salida desde El Calafate', description: 'Retiro desde el alojamiento.', timeLabel: '06:00' },
      { title: 'Ruta 40 y Lago Viedma', description: 'Recorrido con paradas en miradores panorámicos.', timeLabel: '07:30' },
      { title: 'Llegada a El Chaltén', description: 'Tiempo libre para caminar, almorzar y recorrer el pueblo.', timeLabel: '09:30' },
      { title: 'Regreso', description: 'Salida de El Chaltén hacia El Calafate.', timeLabel: '16:30' },
      { title: 'Llegada a El Calafate', description: 'Arribo estimado por la noche.', timeLabel: '19:00' },
    ],
    pickupLocations: [
      { name: 'Alojamientos del centro de El Calafate', offsetMinutes: -30 },
      { name: 'Terminal de Ómnibus', offsetMinutes: -20 },
    ],
    faqs: [
      { question: '¿Alcanza para hacer el trekking al Fitz Roy?', answer: 'No. El trekking a Laguna de los Tres requiere entre 8 y 10 horas y no entra en el tiempo disponible. Sí alcanza para senderos cortos como el Mirador de los Cóndores o Chorrillo del Salto.' },
      { question: '¿Se ve siempre el Fitz Roy?', answer: 'No. La visibilidad depende del clima, que en la zona es muy variable. No es posible garantizarla.' },
      { question: '¿Conviene quedarse a dormir en El Chaltén?', answer: 'Si tu objetivo son los trekkings largos, sí. Para una primera visita panorámica, la excursión de día completo es suficiente.' },
    ],
    relatedSlugs: ['glaciar-perito-moreno-pasarelas', 'traslado-el-calafate-el-chalten'],
  },
  {
    slug: 'balcones-de-calafate-4x4',
    name: 'Balcones de El Calafate en 4x4',
    summary:
      'Ascenso en vehículo 4x4 a los cerros que rodean la ciudad, con vistas panorámicas del Lago Argentino.',
    description: `Los Balcones de El Calafate son los sectores elevados que rodean la ciudad, a los que se accede por caminos de ripio en vehículos todo terreno.

Desde los miradores se domina el Lago Argentino, la Bahía Redonda, la ciudad y, en días despejados, la línea de la cordillera hacia el oeste.

El recorrido incluye una introducción a la flora de la estepa patagónica —el calafate, la mata negra, el coirón— y a la geología de la región.

Es una salida de medio día, ideal para el primer o el último día de estadía.`,
    categorySlug: 'trekking-y-aventura',
    destinationSlug: 'el-calafate',
    durationMinutes: 240,
    difficulty: 'EASY',
    location: 'El Calafate',
    maxGroupSize: 12,
    highlights: [
      'Vistas panorámicas del Lago Argentino y la ciudad',
      'Recorrido en vehículo 4x4 por caminos de montaña',
      'Interpretación de la flora y la geología de la estepa',
      'Salida de medio día',
    ],
    included: ['Traslado desde el alojamiento', 'Vehículo 4x4 con conductor-guía', 'Refrigerio'],
    excluded: ['Almuerzo', 'Bebidas alcohólicas'],
    importantInfo: `El recorrido transita caminos de ripio con pendientes. No se recomienda a personas con problemas de espalda o cervicales.\n\nLa actividad puede suspenderse por nieve o lluvia intensa que afecte el estado de los caminos.\n\n${PATAGONIA_CLOTHING}`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: false,
    options: [
      {
        name: 'Salida de la mañana',
        description: 'Recorrido matutino con refrigerio.',
        price: 95000,
        childPrice: 70000,
        durationMinutes: 240,
        capacity: 12,
        maxParticipants: 12,
        pickupIncluded: true,
        departureTimes: ['09:00'],
        freeCancellationHours: 24,
      },
      {
        name: 'Salida del atardecer',
        description: 'Recorrido vespertino para ver la puesta de sol sobre el lago.',
        price: 110000,
        childPrice: 80000,
        durationMinutes: 240,
        capacity: 12,
        maxParticipants: 12,
        pickupIncluded: true,
        departureTimes: ['16:30'],
        freeCancellationHours: 24,
      },
    ],
    itinerary: [
      { title: 'Retiro del alojamiento', description: 'Salida desde tu hotel en El Calafate.' },
      { title: 'Ascenso a los balcones', description: 'Recorrido en 4x4 por caminos de ripio hasta los miradores.' },
      { title: 'Miradores y refrigerio', description: 'Paradas panorámicas con interpretación del entorno.' },
      { title: 'Regreso', description: 'Descenso y retorno a la ciudad.' },
    ],
    pickupLocations: [{ name: 'Alojamientos del centro de El Calafate', offsetMinutes: -15 }],
    faqs: [
      { question: '¿Es apta para chicos?', answer: 'Sí, aunque el camino tiene tramos irregulares. Consultanos si viajás con niños pequeños.' },
      { question: '¿Qué pasa si llueve?', answer: 'La salida puede suspenderse si el estado de los caminos lo requiere. En ese caso, reprogramamos o reintegramos el total.' },
    ],
    relatedSlugs: ['glaciar-perito-moreno-pasarelas', 'city-tour-el-calafate'],
  },
  {
    slug: 'estancia-patagonica-dia-de-campo',
    name: 'Estancia patagónica — Día de campo',
    summary:
      'Jornada en una estancia de la estepa con demostración de esquila, caminata y asado patagónico.',
    description: `El día de campo en una estancia patagónica permite conocer la actividad ganadera que estructuró la ocupación de Santa Cruz desde fines del siglo XIX.

La jornada incluye una recorrida por las instalaciones del casco, una demostración de esquila y manejo de ovinos con perros de trabajo, y una caminata por los alrededores.

El almuerzo es un asado de cordero patagónico al asador, la preparación tradicional de la región.

Es una salida de ritmo pausado, adecuada para familias y para quienes buscan una experiencia cultural además del paisaje.`,
    categorySlug: 'estancias-y-cultura',
    destinationSlug: 'el-calafate',
    durationMinutes: 420,
    difficulty: 'EASY',
    location: 'Estepa patagónica, Santa Cruz',
    maxGroupSize: 30,
    highlights: [
      'Demostración de esquila y manejo de ovinos',
      'Asado de cordero patagónico al asador',
      'Caminata por la estepa',
      'Historia de la ganadería en Santa Cruz',
    ],
    included: ['Traslado desde El Calafate', 'Recepción y recorrida guiada', 'Demostración de esquila', 'Almuerzo con asado de cordero'],
    excluded: ['Bebidas alcohólicas adicionales', 'Cabalgatas opcionales'],
    importantInfo: `Informanos al reservar si tenés restricciones alimentarias: la estancia puede preparar alternativas vegetarianas con aviso previo.\n\nLa demostración de esquila se realiza con animales vivos y a cargo de personal especializado.\n\n${PATAGONIA_CLOTHING}`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: false,
    options: [
      {
        name: 'Día de campo completo',
        description: 'Jornada completa con almuerzo incluido.',
        price: 150000,
        childPrice: 95000,
        durationMinutes: 420,
        capacity: 30,
        maxParticipants: 30,
        pickupIncluded: true,
        departureTimes: ['10:00'],
        freeCancellationHours: 48,
      },
      {
        name: 'Día de campo con cabalgata',
        description: 'Suma una cabalgata guiada de aproximadamente una hora.',
        price: 195000,
        childPrice: 130000,
        durationMinutes: 480,
        capacity: 16,
        maxParticipants: 16,
        pickupIncluded: true,
        departureTimes: ['10:00'],
        freeCancellationHours: 48,
      },
    ],
    itinerary: [
      { title: 'Salida desde El Calafate', description: 'Retiro desde el alojamiento.', timeLabel: '10:00' },
      { title: 'Recepción en la estancia', description: 'Bienvenida y recorrida por el casco.', timeLabel: '11:00' },
      { title: 'Demostración de esquila', description: 'Trabajo con ovinos y perros de campo.', timeLabel: '11:45' },
      { title: 'Almuerzo', description: 'Asado de cordero patagónico al asador.', timeLabel: '13:00' },
      { title: 'Caminata y regreso', description: 'Recorrido por los alrededores y retorno a la ciudad.', timeLabel: '15:00' },
    ],
    pickupLocations: [{ name: 'Alojamientos del centro de El Calafate', offsetMinutes: -20 }],
    faqs: [
      { question: '¿Hay opción vegetariana?', answer: 'Sí, con aviso previo al reservar. Indicanos cualquier restricción alimentaria en el campo de comentarios.' },
      { question: '¿La cabalgata requiere experiencia?', answer: 'No. Es un paseo de ritmo tranquilo con caballos mansos y guía permanente.' },
    ],
    relatedSlugs: ['city-tour-el-calafate', 'glaciar-perito-moreno-pasarelas'],
  },
  {
    slug: 'city-tour-el-calafate',
    name: 'City Tour El Calafate y Laguna Nimez',
    summary:
      'Recorrido por los puntos de interés de la ciudad, con visita a la Reserva Natural Laguna Nimez.',
    description: `El city tour recorre los sitios de interés de El Calafate: el centro histórico, la avenida Libertador, la costanera del Lago Argentino y los miradores urbanos.

Incluye la visita a la Reserva Natural Laguna Nimez, un área protegida municipal donde se observan flamencos australes, cisnes de cuello negro y otras aves acuáticas desde senderos peatonales.

El recorrido aporta contexto sobre la historia reciente de la localidad, que se consolidó como centro de servicios turísticos a partir de la creación del Parque Nacional.

Es una buena opción para el día de llegada, cuando conviene una actividad corta y de baja exigencia.`,
    categorySlug: 'estancias-y-cultura',
    destinationSlug: 'el-calafate',
    durationMinutes: 180,
    difficulty: 'EASY',
    location: 'El Calafate',
    maxGroupSize: 18,
    highlights: [
      'Reserva Natural Laguna Nimez y su avifauna',
      'Costanera del Lago Argentino',
      'Historia y desarrollo de El Calafate',
      'Actividad corta, ideal para el día de llegada',
    ],
    included: ['Traslado desde el alojamiento', 'Guía local', 'Recorrido por la reserva'],
    excluded: ['Entrada a la Reserva Laguna Nimez', 'Comidas y bebidas'],
    importantInfo: `La entrada a la Reserva Natural Laguna Nimez se abona en el acceso y su valor lo fija el municipio.\n\nEl recorrido por la reserva es a pie, por senderos de baja dificultad. Llevá calzado cómodo y protección para el viento.`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: false,
    options: [
      {
        name: 'City tour compartido',
        description: 'Recorrido en grupo con guía local.',
        price: 55000,
        childPrice: 35000,
        durationMinutes: 180,
        capacity: 18,
        maxParticipants: 18,
        pickupIncluded: true,
        departureTimes: ['09:30', '15:00'],
        freeCancellationHours: 24,
      },
      {
        name: 'City tour privado',
        description: 'Guía y vehículo exclusivos, con horario flexible.',
        price: 180000,
        durationMinutes: 180,
        capacity: 6,
        maxParticipants: 6,
        pickupIncluded: true,
        departureTimes: [],
        freeCancellationHours: 24,
      },
    ],
    itinerary: [
      { title: 'Retiro del alojamiento', description: 'Inicio del recorrido.' },
      { title: 'Centro y avenida Libertador', description: 'Recorrido por el casco urbano.' },
      { title: 'Laguna Nimez', description: 'Caminata por la reserva y observación de aves.' },
      { title: 'Costanera y regreso', description: 'Parada en la Bahía Redonda y retorno.' },
    ],
    pickupLocations: [{ name: 'Alojamientos del centro de El Calafate', offsetMinutes: -15 }],
    faqs: [
      { question: '¿Sirve para el día de llegada?', answer: 'Sí. Dura unas tres horas y es de baja exigencia física, por lo que funciona bien el día que llegás o el último antes de partir.' },
      { question: '¿Qué aves se pueden ver?', answer: 'Flamencos australes, cisnes de cuello negro, macáes y diversas especies de patos, entre otras. La presencia varía según la época del año.' },
    ],
    relatedSlugs: ['balcones-de-calafate-4x4', 'glaciarium-museo-del-hielo'],
  },
  {
    slug: 'glaciarium-museo-del-hielo',
    name: 'Glaciarium — Museo del Hielo Patagónico',
    summary:
      'Visita al centro de interpretación glaciológica con traslado incluido desde El Calafate.',
    description: `El Glaciarium es un centro de interpretación dedicado a la glaciología, ubicado sobre la ruta que conecta El Calafate con el Parque Nacional.

Sus salas explican cómo se forman los glaciares, cómo funciona el Campo de Hielo Patagónico Sur y qué procesos regulan el avance y retroceso del hielo. Incluye material audiovisual y maquetas interpretativas.

La visita aporta contexto útil antes o después de conocer el Perito Moreno: muchos de los fenómenos que se observan en el glaciar se entienden mejor con esa base.

El edificio cuenta además con un mirador hacia el valle y servicios de cafetería.`,
    categorySlug: 'estancias-y-cultura',
    destinationSlug: 'el-calafate',
    durationMinutes: 180,
    difficulty: 'EASY',
    location: 'El Calafate',
    maxGroupSize: 20,
    highlights: [
      'Salas de interpretación sobre glaciología',
      'Contexto científico sobre el Campo de Hielo Patagónico Sur',
      'Traslado ida y vuelta incluido',
      'Actividad bajo techo, apta para días de mal tiempo',
    ],
    included: ['Traslado ida y vuelta desde El Calafate'],
    excluded: ['Entrada al Glaciarium', 'Consumiciones en cafetería'],
    importantInfo: `La entrada al museo no está incluida y se abona en el lugar.\n\nEs una actividad bajo techo: una buena alternativa para días de lluvia, nieve o viento intenso.`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: false,
    options: [
      {
        name: 'Traslado ida y vuelta',
        description: 'Servicio de transporte con horarios regulares.',
        price: 28000,
        childPrice: 18000,
        durationMinutes: 180,
        capacity: 20,
        maxParticipants: 20,
        pickupIncluded: true,
        departureTimes: ['11:00', '14:00', '17:00'],
        freeCancellationHours: 12,
      },
    ],
    itinerary: [
      { title: 'Retiro del alojamiento', description: 'Salida hacia el museo.' },
      { title: 'Visita al Glaciarium', description: 'Tiempo libre para recorrer las salas.' },
      { title: 'Regreso', description: 'Retorno a El Calafate.' },
    ],
    pickupLocations: [{ name: 'Alojamientos del centro de El Calafate', offsetMinutes: -15 }],
    faqs: [
      { question: '¿La entrada está incluida?', answer: 'No. El servicio cubre el traslado ida y vuelta; la entrada se abona en el museo.' },
      { question: '¿Cuánto tiempo se necesita para la visita?', answer: 'Entre una hora y media y dos horas alcanzan para recorrer las salas con tranquilidad.' },
    ],
    relatedSlugs: ['city-tour-el-calafate', 'glaciar-perito-moreno-pasarelas'],
  },
  {
    slug: 'kayak-lago-argentino',
    name: 'Kayak en el Lago Argentino',
    summary:
      'Salida guiada en kayak por la costa del Lago Argentino, apta para principiantes.',
    description: `La salida en kayak recorre un sector protegido de la costa del Lago Argentino, con guías habilitados y equipo completo.

No requiere experiencia previa: la actividad comienza con una instrucción en tierra sobre técnica de paleo y seguridad, y se desarrolla en aguas cercanas a la costa.

Desde el agua, la perspectiva del lago y de la línea de cerros que rodea El Calafate es distinta de la que ofrece cualquier mirador terrestre.

La salida está sujeta a las condiciones de viento, que en la región pueden cambiar en pocas horas.`,
    categorySlug: 'trekking-y-aventura',
    destinationSlug: 'lago-argentino',
    durationMinutes: 210,
    difficulty: 'MODERATE',
    location: 'Lago Argentino',
    minAge: 14,
    maxGroupSize: 10,
    highlights: [
      'Navegación en kayak por la costa del lago',
      'Instrucción previa: no requiere experiencia',
      'Equipo completo de seguridad incluido',
      'Grupos reducidos con guía habilitado',
    ],
    included: ['Kayak, remo, chaleco salvavidas y traje seco', 'Instrucción previa', 'Guía habilitado', 'Refrigerio'],
    excluded: ['Traslado desde el alojamiento', 'Comidas'],
    importantInfo: `Actividad a partir de los 14 años. Los menores de 18 deben ir acompañados por un adulto responsable.\n\nLa salida depende de las condiciones de viento y puede suspenderse el mismo día por razones de seguridad. En ese caso se reprograma o se reintegra el total.\n\nLlevá ropa de abrigo para usar bajo el traje seco, y una muda completa de recambio.`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: false,
    options: [
      {
        name: 'Travesía de medio día',
        description: 'Salida guiada con instrucción previa y refrigerio.',
        price: 140000,
        durationMinutes: 210,
        capacity: 10,
        minParticipants: 2,
        maxParticipants: 10,
        pickupIncluded: false,
        departureTimes: ['09:30', '14:30'],
        freeCancellationHours: 24,
      },
    ],
    itinerary: [
      { title: 'Punto de encuentro', description: 'Presentación y entrega de equipo.' },
      { title: 'Instrucción en tierra', description: 'Técnica de paleo y normas de seguridad.' },
      { title: 'Travesía', description: 'Recorrido guiado por la costa del lago.' },
      { title: 'Cierre', description: 'Regreso, refrigerio y devolución del equipo.' },
    ],
    pickupLocations: [{ name: 'Punto de encuentro en la costanera', offsetMinutes: -30 }],
    faqs: [
      { question: '¿Necesito experiencia previa?', answer: 'No. La salida incluye una instrucción en tierra y se desarrolla en aguas cercanas a la costa, con guía permanente.' },
      { question: '¿Qué pasa si hay viento?', answer: 'Si las condiciones no son seguras, la salida se suspende. Reprogramamos sin cargo o reintegramos el total.' },
    ],
    relatedSlugs: ['balcones-de-calafate-4x4', 'cabalgata-patagonica'],
  },
  {
    slug: 'cabalgata-patagonica',
    name: 'Cabalgata por la estepa patagónica',
    summary: 'Cabalgata guiada por senderos de estepa con vistas al Lago Argentino.',
    description: `La cabalgata recorre senderos de la estepa en los alrededores de El Calafate, con vistas al Lago Argentino y a la línea de cerros del oeste.

Los caballos son criollos, habituados al terreno y al trabajo con visitantes. Los guías acompañan al grupo durante todo el recorrido y adaptan el ritmo al nivel de los participantes.

No se requiere experiencia previa para la salida corta. Las opciones más largas sí suponen cierta familiaridad con la monta.

Es una forma de recorrer el entorno al ritmo en que históricamente se trabajó el campo en la región.`,
    categorySlug: 'trekking-y-aventura',
    destinationSlug: 'el-calafate',
    durationMinutes: 180,
    difficulty: 'MODERATE',
    location: 'El Calafate',
    minAge: 8,
    maxGroupSize: 10,
    highlights: [
      'Recorrido a caballo por senderos de estepa',
      'Vistas panorámicas del Lago Argentino',
      'Caballos criollos y guías baqueanos',
      'Apta para principiantes en la opción corta',
    ],
    included: ['Caballo y montura', 'Guía baqueano', 'Casco de seguridad', 'Refrigerio'],
    excluded: ['Traslado desde el alojamiento', 'Comidas'],
    importantInfo: `Edad mínima: 8 años. Existe un límite de peso de 100 kg por razones de bienestar animal.\n\nUsá pantalón largo y calzado cerrado. No se admite calzado abierto.\n\nLa salida puede suspenderse por lluvia intensa o viento fuerte.\n\n${PATAGONIA_CLOTHING}`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: false,
    options: [
      {
        name: 'Cabalgata corta (2 horas)',
        description: 'Recorrido introductorio, apto para principiantes.',
        price: 85000,
        childPrice: 60000,
        durationMinutes: 120,
        capacity: 10,
        minParticipants: 2,
        maxParticipants: 10,
        pickupIncluded: false,
        departureTimes: ['10:00', '15:00'],
        freeCancellationHours: 24,
      },
      {
        name: 'Cabalgata de medio día',
        description: 'Recorrido extendido con refrigerio en el campo.',
        price: 145000,
        durationMinutes: 300,
        capacity: 8,
        minParticipants: 2,
        maxParticipants: 8,
        pickupIncluded: false,
        departureTimes: ['09:30'],
        freeCancellationHours: 48,
      },
    ],
    itinerary: [
      { title: 'Encuentro', description: 'Presentación, asignación de caballos e instrucción básica.' },
      { title: 'Cabalgata', description: 'Recorrido guiado por senderos de estepa.' },
      { title: 'Mirador', description: 'Parada panorámica con refrigerio.' },
      { title: 'Regreso', description: 'Retorno al punto de partida.' },
    ],
    pickupLocations: [{ name: 'Punto de encuentro a coordinar', offsetMinutes: -20 }],
    faqs: [
      { question: '¿Necesito saber andar a caballo?', answer: 'Para la cabalgata corta no. Los caballos son mansos y los guías acompañan todo el recorrido. La opción de medio día sí requiere alguna experiencia previa.' },
      { question: '¿Hay límite de peso?', answer: 'Sí, 100 kg, por el bienestar de los animales.' },
    ],
    relatedSlugs: ['estancia-patagonica-dia-de-campo', 'kayak-lago-argentino'],
  },
  {
    slug: 'traslado-aeropuerto-el-calafate',
    name: 'Traslado Aeropuerto El Calafate ↔ Ciudad',
    summary:
      'Traslado entre el Aeropuerto Comandante Armando Tola y tu alojamiento en El Calafate.',
    description: `El Aeropuerto Internacional Comandante Armando Tola (FTE) se encuentra a unos 23 kilómetros del centro de El Calafate.

El servicio de traslado conecta la terminal con los alojamientos de la ciudad, con seguimiento del número de vuelo: si el vuelo se demora, el servicio se ajusta al horario real de arribo.

Para el traslado de salida, coordinamos el retiro desde el alojamiento con la antelación adecuada al horario de tu vuelo.

El vehículo y la capacidad varían según la opción contratada.`,
    categorySlug: 'traslados-aeropuerto',
    destinationSlug: 'el-calafate',
    durationMinutes: 40,
    difficulty: 'EASY',
    location: 'Aeropuerto FTE — El Calafate',
    maxGroupSize: 19,
    highlights: [
      'Seguimiento del número de vuelo',
      'Recepción en la terminal de arribos',
      'Traslado directo a tu alojamiento',
      'Opciones compartida y privada',
    ],
    included: ['Traslado entre el aeropuerto y el alojamiento', 'Espera incluida por demoras del vuelo'],
    excluded: ['Propinas', 'Equipaje que exceda una valija y un bolso de mano por pasajero'],
    importantInfo: `Indicá el número de vuelo, la fecha y el horario al reservar. Sin esa información no podemos garantizar la recepción.\n\nPara traslados de salida, coordinamos el retiro con al menos 2 horas de antelación al horario del vuelo.\n\nSi viajás con equipaje especial (bicicletas, equipo de montaña, tablas), avisanos al reservar para asignar un vehículo adecuado.`,
    cancellationPolicy: `Cancelación sin cargo hasta 12 horas antes del horario de servicio. Con menos de 12 horas, se retiene el 50%. En caso de no presentarse, no corresponde reintegro.

Si tu vuelo se cancela o reprograma, avisanos apenas lo sepas: reprogramamos el traslado sin cargo.`,
    featured: true,
    options: [
      {
        name: 'Compartido (por persona)',
        description: 'Servicio regular compartido con otros pasajeros.',
        price: 18000,
        childPrice: 12000,
        durationMinutes: 45,
        capacity: 19,
        maxParticipants: 19,
        pickupIncluded: true,
        departureTimes: [],
        freeCancellationHours: 12,
      },
      {
        name: 'Privado hasta 4 pasajeros',
        description: 'Vehículo exclusivo, directo a tu alojamiento.',
        price: 65000,
        durationMinutes: 35,
        capacity: 4,
        maxParticipants: 4,
        pickupIncluded: true,
        departureTimes: [],
        freeCancellationHours: 12,
      },
      {
        name: 'Privado hasta 8 pasajeros',
        description: 'Minivan exclusiva para grupos o familias.',
        price: 95000,
        durationMinutes: 35,
        capacity: 8,
        maxParticipants: 8,
        pickupIncluded: true,
        departureTimes: [],
        freeCancellationHours: 12,
      },
    ],
    itinerary: [
      { title: 'Recepción en arribos', description: 'Te esperamos en la terminal con cartel identificatorio.' },
      { title: 'Traslado', description: 'Recorrido de aproximadamente 30 a 40 minutos hasta la ciudad.' },
      { title: 'Llegada al alojamiento', description: 'Dejamos a cada pasajero en la puerta de su alojamiento.' },
    ],
    pickupLocations: [
      { name: 'Aeropuerto Comandante Armando Tola (FTE)', offsetMinutes: 0 },
      { name: 'Alojamientos del centro de El Calafate', offsetMinutes: -120 },
    ],
    faqs: [
      { question: '¿Qué pasa si mi vuelo se demora?', answer: 'Hacemos seguimiento del número de vuelo que nos indiques y ajustamos el servicio al horario real de arribo, sin costo adicional.' },
      { question: '¿Cuánto se tarda del aeropuerto al centro?', answer: 'Entre 30 y 40 minutos, según el tránsito y la ubicación del alojamiento. Son unos 23 kilómetros.' },
      { question: '¿Puedo llevar equipaje voluminoso?', answer: 'Sí, pero avisanos al reservar para asignar un vehículo con capacidad suficiente.' },
    ],
    relatedSlugs: ['traslado-el-calafate-el-chalten', 'glaciar-perito-moreno-pasarelas'],
  },
  {
    slug: 'traslado-el-calafate-el-chalten',
    name: 'Traslado El Calafate ↔ El Chaltén',
    summary:
      'Conexión terrestre entre El Calafate y El Chaltén por las rutas 40 y 23, con paradas panorámicas.',
    description: `El trayecto entre El Calafate y El Chaltén cubre unos 215 kilómetros por la Ruta Nacional 40 y la Ruta Provincial 23, bordeando el Lago Viedma en su tramo final.

El recorrido demora aproximadamente tres horas e incluye una parada técnica en el camino.

En días despejados, la aproximación a El Chaltén ofrece las primeras vistas del Cerro Fitz Roy y el Cerro Torre.

El servicio opera en ambos sentidos y se puede contratar solo de ida o ida y vuelta en días diferentes.`,
    categorySlug: 'traslados-interurbanos',
    destinationSlug: 'el-chalten',
    durationMinutes: 180,
    difficulty: 'EASY',
    location: 'Ruta 40 — Ruta 23',
    maxGroupSize: 45,
    highlights: [
      'Recorrido por la Ruta 40 y el Lago Viedma',
      'Parada técnica en el trayecto',
      'Primeras vistas del Fitz Roy al aproximarse',
      'Servicio en ambos sentidos',
    ],
    included: ['Traslado terrestre', 'Parada técnica'],
    excluded: ['Comidas y bebidas', 'Alojamiento en El Chaltén'],
    importantInfo: `Indicá al reservar si el traslado es solo de ida o ida y vuelta, y las fechas de cada tramo.\n\nEn invierno el servicio puede reducir frecuencias o suspenderse por condiciones de la ruta.\n\nLlevá agua y algo para comer: el trayecto tiene pocos servicios intermedios.`,
    cancellationPolicy: `Cancelación sin cargo hasta 24 horas antes de la salida. Con menos de 24 horas, se retiene el 50%. En caso de no presentarse, no corresponde reintegro.

Si el servicio se suspende por condiciones de la ruta, ofrecemos reprogramación o reintegro total.`,
    featured: false,
    options: [
      {
        name: 'Solo ida',
        description: 'Un tramo, en el sentido que indiques.',
        price: 45000,
        childPrice: 32000,
        durationMinutes: 180,
        capacity: 45,
        maxParticipants: 45,
        pickupIncluded: true,
        departureTimes: ['08:00', '18:00'],
        freeCancellationHours: 24,
      },
      {
        name: 'Ida y vuelta',
        description: 'Ambos tramos, con fechas a elección.',
        price: 82000,
        childPrice: 58000,
        durationMinutes: 180,
        capacity: 45,
        maxParticipants: 45,
        pickupIncluded: true,
        departureTimes: ['08:00', '18:00'],
        freeCancellationHours: 24,
      },
    ],
    itinerary: [
      { title: 'Salida', description: 'Retiro desde la terminal o el alojamiento.', timeLabel: '08:00' },
      { title: 'Ruta 40', description: 'Recorrido por la estepa patagónica.', timeLabel: '08:30' },
      { title: 'Parada técnica', description: 'Descanso en el camino.', timeLabel: '10:00' },
      { title: 'Llegada', description: 'Arribo a destino.', timeLabel: '11:00' },
    ],
    pickupLocations: [
      { name: 'Terminal de Ómnibus El Calafate', offsetMinutes: -20 },
      { name: 'Alojamientos del centro de El Calafate', offsetMinutes: -35 },
    ],
    faqs: [
      { question: '¿Cuánto dura el viaje?', answer: 'Aproximadamente tres horas para cubrir los 215 kilómetros, incluyendo una parada técnica.' },
      { question: '¿Opera todo el año?', answer: 'Sí, aunque en invierno las frecuencias se reducen y el servicio puede suspenderse por condiciones de la ruta.' },
    ],
    relatedSlugs: ['el-chalten-dia-completo', 'traslado-aeropuerto-el-calafate'],
  },
  {
    slug: 'perito-moreno-con-navegacion',
    name: 'Perito Moreno con navegación y pasarelas',
    summary:
      'Combinación de la visita a las pasarelas con el Safari Náutico frente a la pared sur del glaciar.',
    description: `Esta combinación resuelve en una sola jornada las dos formas de ver el Glaciar Perito Moreno: desde las pasarelas y desde el agua.

La mañana se destina al circuito peatonal, con tiempo para recorrer los distintos miradores. Luego se realiza el Safari Náutico, una navegación de aproximadamente una hora por el Canal de los Témpanos frente a la pared sur.

Contratar ambas actividades juntas evita gestionar por separado el traslado, el horario de embarque y la coordinación entre ambas.

Es la opción más completa para quienes disponen de un solo día para el glaciar.`,
    categorySlug: 'glaciares',
    destinationSlug: 'glaciar-perito-moreno',
    durationMinutes: 600,
    difficulty: 'EASY',
    location: 'Parque Nacional Los Glaciares',
    maxGroupSize: 40,
    highlights: [
      'Pasarelas y navegación en una sola jornada',
      'Vista del frente desde tierra y desde el agua',
      'Coordinación de horarios resuelta',
      'Guía acompañante durante todo el día',
    ],
    included: [
      'Traslado ida y vuelta desde El Calafate',
      'Guía acompañante',
      'Tiempo en el área de pasarelas',
      'Safari Náutico (navegación de 1 hora)',
    ],
    excluded: ['Entrada al Parque Nacional Los Glaciares', 'Almuerzo y bebidas'],
    importantInfo: `${PARK_FEE_NOTE}\n\nLa navegación puede suspenderse por viento. Si eso ocurre, se reintegra la porción correspondiente a esa actividad.\n\n${PATAGONIA_CLOTHING}`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: true,
    options: [
      {
        name: 'Regular',
        description: 'Traslado compartido con navegación incluida.',
        price: 145000,
        childPrice: 100000,
        durationMinutes: 600,
        capacity: 40,
        maxParticipants: 40,
        pickupIncluded: true,
        departureTimes: ['07:30'],
        freeCancellationHours: 24,
      },
      {
        name: 'Premium en minibús',
        description: 'Grupo reducido, con navegación y más tiempo en pasarelas.',
        price: 205000,
        childPrice: 145000,
        durationMinutes: 600,
        capacity: 16,
        maxParticipants: 16,
        pickupIncluded: true,
        departureTimes: ['08:00'],
        freeCancellationHours: 24,
      },
    ],
    itinerary: [
      { title: 'Salida desde El Calafate', description: 'Retiro desde el alojamiento.', timeLabel: '07:30' },
      { title: 'Ingreso al parque', description: 'Registro y pago de la entrada.', timeLabel: '09:15' },
      { title: 'Pasarelas', description: 'Recorrido por los circuitos peatonales.', timeLabel: '09:45' },
      { title: 'Safari Náutico', description: 'Navegación frente a la pared sur del glaciar.', timeLabel: '13:00' },
      { title: 'Regreso', description: 'Retorno a El Calafate.', timeLabel: '15:30' },
    ],
    pickupLocations: [
      { name: 'Alojamientos del centro de El Calafate', offsetMinutes: -30 },
      { name: 'Terminal de Ómnibus', offsetMinutes: -20 },
    ],
    faqs: [
      { question: '¿Qué pasa si se suspende la navegación?', answer: 'Si el viento impide navegar, la excursión se realiza igual con las pasarelas y se reintegra la porción correspondiente al Safari Náutico.' },
      { question: '¿Conviene sobre la excursión simple?', answer: 'Si disponés de un solo día para el glaciar, sí: ver el frente desde el agua aporta una perspectiva que las pasarelas no dan.' },
    ],
    relatedSlugs: ['glaciar-perito-moreno-pasarelas', 'safari-nautico-perito-moreno', 'minitrekking-perito-moreno'],
  },
  {
    slug: 'trekking-cerro-frias',
    name: 'Trekking y 4x4 al Cerro Frías',
    summary:
      'Ascenso en 4x4 y caminata guiada en el Cerro Frías, con vistas al Lago Argentino y al Torres del Paine.',
    description: `El Cerro Frías se encuentra a unos 25 kilómetros de El Calafate y ofrece uno de los panoramas más amplios de la región.

La actividad combina un ascenso en vehículo 4x4 por caminos de montaña con una caminata guiada en el sector superior.

Desde la cumbre, en días despejados, se domina el Lago Argentino, el Lago Viedma y, hacia el oeste, el macizo del Torres del Paine, ya en territorio chileno.

La caminata es de dificultad media y recorre un sector de bosque de lenga y ñire antes de salir al área abierta de la cumbre.`,
    categorySlug: 'trekking-y-aventura',
    destinationSlug: 'el-calafate',
    durationMinutes: 300,
    difficulty: 'MODERATE',
    location: 'Cerro Frías, El Calafate',
    minAge: 10,
    maxGroupSize: 14,
    highlights: [
      'Panorámica del Lago Argentino y el Lago Viedma',
      'Vista del macizo Torres del Paine en días despejados',
      'Bosque de lenga y ñire',
      'Combinación de 4x4 y caminata guiada',
    ],
    included: ['Traslado desde el alojamiento', 'Vehículo 4x4', 'Guía de trekking', 'Refrigerio'],
    excluded: ['Almuerzo', 'Bebidas alcohólicas'],
    importantInfo: `La caminata es de dificultad media, con desnivel. Requiere calzado de trekking cerrado y condición física acorde.\n\nLa visibilidad del Torres del Paine depende enteramente de las condiciones meteorológicas.\n\nLa actividad puede suspenderse por nieve, lluvia intensa o viento fuerte.\n\n${PATAGONIA_CLOTHING}`,
    cancellationPolicy: STANDARD_CANCELLATION,
    featured: false,
    options: [
      {
        name: 'Medio día',
        description: 'Ascenso en 4x4 y caminata guiada con refrigerio.',
        price: 125000,
        childPrice: 90000,
        durationMinutes: 300,
        capacity: 14,
        minParticipants: 2,
        maxParticipants: 14,
        pickupIncluded: true,
        departureTimes: ['09:00', '14:30'],
        freeCancellationHours: 24,
      },
    ],
    itinerary: [
      { title: 'Retiro del alojamiento', description: 'Salida desde El Calafate.' },
      { title: 'Ascenso en 4x4', description: 'Recorrido por caminos de montaña.' },
      { title: 'Caminata guiada', description: 'Trekking de dificultad media hasta los miradores.' },
      { title: 'Refrigerio y regreso', description: 'Descanso en la cumbre y retorno.' },
    ],
    pickupLocations: [{ name: 'Alojamientos del centro de El Calafate', offsetMinutes: -20 }],
    faqs: [
      { question: '¿Qué nivel físico requiere?', answer: 'Dificultad media: hay desnivel y el terreno es irregular. Se requiere calzado de trekking y estar habituado a caminar.' },
      { question: '¿Siempre se ve el Torres del Paine?', answer: 'No. Depende de la visibilidad del día, que en la región es muy variable.' },
    ],
    relatedSlugs: ['balcones-de-calafate-4x4', 'minitrekking-perito-moreno'],
  },
]
