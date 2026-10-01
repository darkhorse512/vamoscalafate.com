#!/usr/bin/env node
/**
 * Loads the real excursion catalogue from the business brief ("MiExcursion"
 * Drive folder): ten excursions with their texts, price bands, add-ons,
 * schedules, route maps, SEO and photographs.
 *
 *   node --experimental-strip-types scripts/load-catalog.mjs <photos-dir>
 *
 * Idempotent: re-running updates the same tours (matched by slug) and reuses
 * already-imported photos (matched by source path), so it can be run again
 * after editing the data below.
 *
 * PRICES: the amounts below are the latest ones in the brief's correction
 * documents, which date from May 2023. They are loaded so the price
 * STRUCTURE is complete, and must be updated in the admin before taking
 * bookings.
 *
 * PHOTOS: phone and WhatsApp photographs get a gentle brightness, contrast
 * and saturation lift (the brief asked for "luz y colores"); photographs that
 * are already professionally edited are only resized and converted to WebP.
 */

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { config } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../packages/db/generated/client/client.ts'

const require = createRequire(new URL('../web/package.json', import.meta.url))
const sharp = require('sharp')

config({ path: path.join(process.cwd(), 'web/.env') })
const PHOTOS = process.argv[2]
if (!PHOTOS) {
  console.error('Usage: load-catalog.mjs <photos-dir>')
  process.exit(1)
}
const STORAGE = process.env.STORAGE_LOCAL_DIR
const PUBLIC_BASE = (process.env.STORAGE_PUBLIC_URL ?? '').replace(/\/$/, '')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

const ARS = (amount) => Math.round(amount * 100)
const map = (mid) => `https://www.google.com/maps/d/embed?mid=${mid}&ehbc=2E312F`

const PARK_TICKET =
  'Entrada al Parque Nacional Los Glaciares (se compra online en ventaweb.apn.gob.ar o se abona en efectivo, en pesos, al ingresar)'

const SCHEDULE_NOTE =
  'El horario depende de la disponibilidad al momento de la reserva y se confirma el día anterior a la excursión. Si contrataste traslado, el horario de búsqueda por tu hotel también se confirma el día anterior.'

const NO_RECEPTION_NOTE =
  'No se realizan búsquedas en hospedajes sin recepción: en ese caso te indicamos un punto de encuentro cercano.'

// ─────────────────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: 'glaciares', name: 'Glaciares', sortOrder: 1, description: 'Excursiones al Glaciar Perito Moreno: pasarelas, miradores y el frente de hielo.' },
  { slug: 'navegaciones', name: 'Navegaciones', sortOrder: 2, description: 'Navegaciones por el Lago Argentino frente a los glaciares Perito Moreno, Upsala y Spegazzini.' },
  { slug: 'trekking-y-aventura', name: 'Trekking', sortOrder: 3, description: 'Caminatas sobre el hielo y por los senderos de El Chaltén, al pie del Fitz Roy.' },
  { slug: 'aventura', name: 'Aventura', sortOrder: 4, description: 'Cabalgatas, tirolesa, 4x4 y trekking en el Cerro Frías, con vistas al Lago Argentino.' },
  { slug: 'excursiones-de-dia-completo', name: 'Día completo', sortOrder: 5, description: 'Excursiones de jornada completa, incluida la visita a Torres del Paine (Chile).' },
]

// ─────────────────────────────────────────────────────────────────────────────
// The catalogue, in homepage order.
// `photos.pick` are 1-based positions in the folder's sorted file list; the
// first is the cover. `previousSlugs` are redirected to the new slug.
// ─────────────────────────────────────────────────────────────────────────────

const TOURS = [
  {
    slug: 'glaciar-perito-moreno-pasarelas',
    name: 'Glaciar Perito Moreno: Pasarelas',
    category: 'glaciares',
    destination: 'glaciar-perito-moreno',
    summary:
      'Día completo frente al Glaciar Perito Moreno: traslado desde tu hotel y tiempo libre para recorrer los miradores de las pasarelas.',
    durationMinutes: 8 * 60,
    difficulty: 'EASY',
    location: 'Parque Nacional Los Glaciares',
    languages: ['Español', 'Inglés'],
    mapMid: '1592YwqbGvR_QoOiK_jugL0jY7mRNyxA',
    highlights: [
      'Vista frontal del Glaciar Perito Moreno desde varios miradores',
      'Pasarelas seguras de madera y acero, aptas para todo público',
      'Posibilidad de ver y escuchar desprendimientos de hielo',
      'Opcional: navegación frente al glaciar o Safari Azul',
    ],
    included: ['Traslado ida y vuelta desde tu hotel en El Calafate', 'Tiempo libre en el circuito de pasarelas'],
    excluded: [PARK_TICKET, 'Comidas y bebidas'],
    description: `
## ¿Qué son las pasarelas?

Las pasarelas son una serie de caminos elevados que te permiten caminar frente al Glaciar Perito Moreno y tener una vista privilegiada de su frente de hielo. Están construidas con madera y acero inoxidable y son muy seguras: se recorren con tranquilidad mientras se observa el paisaje.

Durante la caminata vas a poder detenerte en distintos miradores, ubicados estratégicamente para ofrecer las mejores vistas de la extensión de hielo, sus grietas y las masas que se desprenden y caen al agua.

## Dificultad

Es relativamente fácil: las pasarelas están bien construidas y mantienen un nivel seguro para caminar. Conviene llevar calzado cómodo y estar preparado para caminar durante un par de horas.

## El clima

- **En verano** el clima es más agradable, con temperaturas de entre 10 y 20 °C. Recomendamos ropa cómoda, protección solar y gorro.
- **En invierno** las temperaturas pueden estar bajo cero. Las pasarelas abren todo el año: llevá ropa de abrigo, guantes y bufanda para protegerte del viento.

## Sumale una navegación

Si querés vivir el glaciar todavía más de cerca, podés agregar a tu reserva la **Navegación Safari Náutico**, una hora frente a la pared de hielo, o el **Safari Azul**, que suma una caminata por la costa del lago hasta tocar el glaciar.
`,
    importantInfo: `${SCHEDULE_NOTE}\n\n${NO_RECEPTION_NOTE}`,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la excursión.',
    itinerary: [
      { time: '08:30', title: 'Salida desde tu hotel', text: 'Te buscamos por tu alojamiento en El Calafate.' },
      { title: 'Ruta 11 y Lago Argentino', text: 'Recorremos unos 80 km bordeando el Lago Argentino hasta el Parque Nacional Los Glaciares.' },
      { title: 'Circuito de pasarelas', text: 'Tiempo libre para recorrer los miradores frente al glaciar, a tu ritmo.' },
      { title: 'Regreso a El Calafate', text: 'Traslado de regreso a tu hotel.' },
    ],
    options: [
      {
        name: 'Con traslado desde tu hotel',
        description: 'Incluye la búsqueda y el regreso a tu hotel en El Calafate.',
        departureTimes: ['08:30'],
        durationMinutes: 8 * 60,
        capacity: 40,
        tiers: [
          { label: 'Adultos (11 o más años)', ageMin: 11, price: 12000 },
          { label: 'Menores (3 a 10 años)', ageMin: 3, ageMax: 10, price: 9500 },
          { label: 'Menores (0 a 2 años)', ageMin: 0, ageMax: 2, price: 0 },
        ],
      },
    ],
    extras: [
      { name: 'Navegación Safari Náutico', description: 'Una hermosa navegación de una hora frente al Glaciar Perito Moreno.', price: 10000 },
      { name: 'Tocá el Glaciar: Safari Azul', description: 'Navegación y caminata por la costa del lago hasta tocar el glaciar. Duración: 3 h. No incluye minitrekking.', price: 24000 },
    ],
    seo: {
      title: 'Glaciar Perito Moreno: excursión a las pasarelas',
      description: 'Excursión de día completo al Glaciar Perito Moreno desde El Calafate, con traslado y tiempo libre en las pasarelas. Opcional: navegación Safari Náutico.',
      keywords: ['Glaciar Perito Moreno', 'pasarelas', 'navegación', 'clima', 'Patagonia Argentina', 'tour'],
    },
    photos: {
      folder: 'Pasarelas Glaciar Moreno',
      enhance: true,
      alt: 'Glaciar Perito Moreno desde las pasarelas',
      pick: [2, 4, 38, 9, 10, 14, 6, 27, 28, 29, 30, 33, 36, 45, 22],
    },
  },

  {
    slug: 'minitrekking-perito-moreno',
    name: 'Minitrekking sobre el Glaciar Perito Moreno',
    category: 'trekking-y-aventura',
    destination: 'glaciar-perito-moreno',
    summary:
      'Caminata guiada de 90 minutos con crampones sobre el hielo del Perito Moreno, con navegación frente a la pared del glaciar.',
    durationMinutes: 11 * 60,
    difficulty: 'MODERATE',
    location: 'Puerto Bajo de las Sombras, Parque Nacional Los Glaciares',
    minAge: 8,
    maxAge: 65,
    languages: ['Español', 'Inglés'],
    mapMid: '1vqaUNdiE6taRyt5rTUbXG3nNxp58oEo',
    highlights: [
      'Trekking de 90 minutos sobre el hielo con guías especializados',
      'Grietas, sumideros y cavernas de hielo azul',
      'Brindis con whisky y bombones sobre el glaciar',
      'Navegación frente a la pared del Perito Moreno',
    ],
    included: [
      'Crampones para caminar sobre el hielo',
      'Guía de montaña durante la caminata',
      'Trekking sobre el hielo de 90 minutos',
      'Navegación frente a la pared del glaciar',
    ],
    excluded: [PARK_TICKET, 'Comidas: llevá tu vianda y agua (no hay dónde comprar)', 'Traslado desde tu hotel (podés sumarlo como opcional)'],
    description: `
Si buscás una experiencia única en la Patagonia argentina, el Minitrekking sobre el Glaciar Perito Moreno es imperdible.

## Cómo es la excursión

El tour comienza en **Puerto Bajo de las Sombras**, a 72 km de El Calafate. Desde allí cruzamos en barco y, una vez en el glaciar, comenzamos la caminata sobre el hielo.

El Minitrekking se realiza en grupos pequeños, guiados por especialistas. La caminata dura aproximadamente **1 hora y 30 minutos**: tiempo suficiente para disfrutar de las vistas y descubrir los secretos que esconde el hielo. Nos detenemos en varios puntos para tomar fotografías y, al terminar, los guías ofrecen **whisky y bombones para brindar sobre el glaciar**.

Después de la caminata embarcamos para navegar por el lago y ver el glaciar desde el agua, con la posibilidad de observar cómo se desprenden bloques de hielo de su pared.

## El glaciar

El Glaciar Perito Moreno se extiende por más de 250 km² y sus paredes alcanzan hasta 70 metros de altura. Está en constante movimiento: es habitual escuchar el estruendo de los bloques que se rompen y caen al agua. Caminar sobre él permite explorar de cerca sus grietas, cavernas y formaciones de hielo.

## El clima

Es muy variable y puede cambiar en minutos. En verano la temperatura promedio va de 10 a 20 °C y suele haber viento; en invierno, de –10 a 10 °C.

## Qué llevar

Campera y pantalón impermeables, botas de trekking, mochila, lentes de sol, protector solar, guantes y gorro. La actividad no incluye comida: llevá tu vianda y una botella para el agua, porque no hay dónde comprar.

## Con o sin traslado

Podés llegar por tus medios a Puerto Bajo de las Sombras o sumar el **traslado desde tu hotel**, que incluye además **una hora de visita a las pasarelas** del glaciar. Es una excursión de día completo: te recomendamos no planear otra actividad para ese día.
`,
    importantInfo: `**Edad: de 8 a 65 años.** Por exigencia del operador, otras edades no pueden realizar la actividad.

No pueden participar mujeres embarazadas, personas con problemas cardíacos ni recién operadas.

Los drones están prohibidos dentro del Parque Nacional.

${SCHEDULE_NOTE}

${NO_RECEPTION_NOTE}`,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la excursión.',
    itinerary: [
      { time: '07:00', title: 'Búsqueda por tu hotel (si contrataste traslado)', text: 'Salida hacia el Parque Nacional por la Ruta 11.' },
      { title: 'Visita a las pasarelas', text: 'Una hora en los miradores frente al glaciar (solo con traslado).' },
      { title: 'Puerto Bajo de las Sombras', text: 'Embarque y cruce del Brazo Rico hasta la costa del glaciar.' },
      { title: 'Trekking sobre el hielo', text: '90 minutos con crampones y guías especializados, con brindis final.' },
      { title: 'Navegación de regreso', text: 'Vista de la pared del glaciar desde el agua.' },
    ],
    options: [
      {
        name: 'Minitrekking',
        description: 'Encuentro en Puerto Bajo de las Sombras. Sumá el traslado desde tu hotel en «Opcionales».',
        departureTimes: ['07:00'],
        durationMinutes: 11 * 60,
        capacity: 20,
        tiers: [
          { label: 'Adultos (16 a 65 años)', ageMin: 16, ageMax: 65, price: 60000 },
          { label: 'Menores (8 a 15 años)', ageMin: 8, ageMax: 15, price: 51000 },
        ],
      },
    ],
    extras: [
      {
        name: 'Traslado desde tu hotel + visita a las pasarelas',
        description: 'Búsqueda y regreso a tu hotel en El Calafate, con una hora de visita a las pasarelas del glaciar.',
        price: 10000,
      },
    ],
    seo: {
      title: 'Minitrekking sobre el Glaciar Perito Moreno',
      description: 'Caminá 90 minutos sobre el hielo del Perito Moreno con crampones y guías, y navegá frente a su pared. Para personas de 8 a 65 años. Reservá online.',
      keywords: ['Minitrekking', 'Glaciar Perito Moreno', 'aventura', 'naturaleza', 'Patagonia Argentina', 'caminata sobre el hielo'],
    },
    photos: {
      folder: 'Minitrekking',
      enhance: false,
      alt: 'Minitrekking sobre el Glaciar Perito Moreno',
      pick: [36, 39, 2, 4, 6, 8, 10, 12, 16, 17, 19, 37, 38, 40, 14],
    },
  },

  {
    slug: 'el-chalten-trekking-libre',
    previousSlugs: ['el-chalten-dia-completo'],
    name: 'El Chaltén: trekking libre',
    category: 'trekking-y-aventura',
    destination: 'el-chalten',
    summary:
      'Día completo en El Chaltén desde El Calafate por la Ruta 40, con cinco horas libres para caminar al pie del Fitz Roy.',
    durationMinutes: 8 * 60,
    difficulty: 'MODERATE',
    location: 'El Chaltén',
    languages: ['Español', 'Inglés'],
    mapMid: '1xtudwPUM38k51faWnc9hSq3mu4rXWfU',
    highlights: [
      'Ruta 40 con vistas al Fitz Roy, el Cerro Torre y el Lago Viedma',
      'Cinco horas libres para hacer trekking en El Chaltén',
      'Opción tranquila: Mirador de los Cóndores y Chorrillo del Salto',
      'Paisajes de lagos, glaciares y montañas',
    ],
    included: ['Traslado ida y vuelta desde tu hotel en El Calafate', 'Cinco horas libres en El Chaltén'],
    excluded: ['Almuerzo (podés sumarlo como opcional, llevar tu vianda o comprar en el pueblo)'],
    description: `
¿Buscás una aventura en la Patagonia argentina? Sumate a la excursión de trekking libre en El Chaltén desde El Calafate y explorá algunos de los paisajes más impresionantes de la región.

## El recorrido

Salimos de El Calafate por la **Ruta 40**, observando el Cerro Chaltén (Fitz Roy), el Cerro Torre, el Lago Viedma y el Lago Argentino. Al llegar a El Chaltén vas a tener **cinco horas libres para hacer trekking**. Si preferís una caminata tranquila, podés elegir el **Mirador de los Cóndores** y el **Chorrillo del Salto**.

## Qué vas a ver

- **Lagos:** Lago Argentino y Lago Viedma, y el Glaciar Viedma, uno de los más grandes de la Argentina.
- **Cerros:** Fitz Roy, Torre y Poincenot.

## El clima

Puede ser impredecible, aunque en verano (de diciembre a marzo) suele ser fresco y seco. Es clima de montaña y cambia de repente: llevá siempre abrigo.

## Antes de salir

- No olvides tu DNI, pasaporte o cédula de identidad.
- Llevá cámara (los drones no están permitidos dentro del Parque Nacional).
- Si no sumás el almuerzo, podés llevar tu vianda o comprar comida en el pueblo.
`,
    importantInfo: `La búsqueda se realiza por hoteles céntricos con recepción. Para hospedajes más alejados o sin recepción te indicamos un punto de encuentro cercano.

${SCHEDULE_NOTE}`,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la excursión.',
    itinerary: [
      { time: '07:30', title: 'Salida desde El Calafate', text: 'Búsqueda por tu hotel y viaje por la Ruta 40.' },
      { time: '10:30', title: 'Llegada a El Chaltén', text: 'Comienzo del trekking libre: cinco horas para caminar los senderos.' },
      { time: '15:30', title: 'Regreso', text: 'Salida de El Chaltén de vuelta a El Calafate.' },
    ],
    options: [
      {
        name: 'Trekking libre',
        description: 'Traslado ida y vuelta desde tu hotel con cinco horas libres en El Chaltén.',
        departureTimes: ['07:30'],
        durationMinutes: 11 * 60,
        capacity: 40,
        tiers: [
          { label: 'Adultos (12 o más años)', ageMin: 12, price: 15000 },
          { label: 'Menores (0 a 11 años)', ageMin: 0, ageMax: 11, price: 15000 },
        ],
      },
    ],
    extras: [{ name: 'Almuerzo', description: 'Almuerzo en El Chaltén.', price: 3000 }],
    seo: {
      title: 'Trekking libre en El Chaltén desde El Calafate',
      description: 'Excursión de día completo a El Chaltén por la Ruta 40, con 5 horas libres para hacer trekking al pie del Fitz Roy. Traslado desde tu hotel.',
      keywords: ['Trekking libre', 'El Chaltén', 'El Calafate', 'Patagonia Argentina', 'lagos', 'glaciares'],
    },
    photos: {
      folder: 'ElChaltén Trekking Libre',
      enhance: true,
      alt: 'El Chaltén y el Cerro Fitz Roy',
      pick: [10, 9, 8, 21, 4, 6, 7, 1, 20, 16, 17, 3],
    },
  },

  {
    slug: 'trekking-laguna-de-los-tres',
    name: 'El Chaltén: trekking a la Laguna de los Tres',
    category: 'trekking-y-aventura',
    destination: 'el-chalten',
    summary:
      'Trekking de 22 km hasta la Laguna de los Tres, al pie del Fitz Roy, con traslado desde El Calafate. Te esperamos hasta que vuelvas.',
    durationMinutes: 14 * 60,
    difficulty: 'CHALLENGING',
    location: 'El Chaltén, Parque Nacional Los Glaciares',
    minAge: 16,
    languages: ['Español', 'Inglés'],
    mapMid: '1IJBEGjB5W55ZRMiYOxixeQFv7k3hmmI',
    highlights: [
      'La vista más famosa del Cerro Fitz Roy',
      'Glaciar Piedras Blancas, Río Eléctrico y Río Blanco',
      'Regreso por otro sendero, pasando por la Laguna Capri',
      'No nos vamos hasta que vuelvas',
    ],
    included: ['Traslado ida y vuelta desde tu hospedaje en El Calafate', 'Indicaciones y mapas del recorrido'],
    excluded: ['Vianda: llevá tu comida, no hay dónde comprar en el camino', 'Indumentaria de trekking', 'Guía (los senderos son autoguiados)'],
    description: `
Si estás planeando una aventura en la Patagonia argentina, la caminata a la **Laguna de los Tres** es una de las más impresionantes del mundo.

## El recorrido

Te buscamos en tu hotel en El Calafate y te llevamos a **El Chaltén**, al pie del Cerro Fitz Roy. El trekking comienza en **Río Eléctrico**: primero por un hermoso bosque y luego hacia la base del Fitz Roy, con vistas al **Glaciar Piedras Blancas**, el **Río Eléctrico** y el **Río Blanco**.

Al llegar a la Laguna de los Tres tendrás la vista más famosa del Fitz Roy. El regreso se hace por otro camino que pasa por la **Laguna Capri** y llega a El Chaltén, donde te esperamos con nuestro vehículo para volver a El Calafate.

## La caminata

Tiene unos **22 kilómetros** y lleva alrededor de **8 horas**. Es un reto, pero accesible para la mayoría de las personas en buena forma física. Los senderos son autoguiados y están bien señalizados: te damos las indicaciones y los mapas.

**Para tu tranquilidad, no nos vamos hasta que vuelvas.**

## Recomendaciones

Llevá ropa y equipo adecuados al clima, incluido un impermeable y calzado de trekking. Reservá con anticipación: los lugares son limitados. Respetá la naturaleza y no dejes basura en el camino.
`,
    importantInfo: `No apto para menores de 16 años, personas en silla de ruedas o con movilidad reducida, ni embarazadas.

${SCHEDULE_NOTE}`,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la excursión.',
    itinerary: [
      { time: '07:00', title: 'Búsqueda por tu hotel en El Calafate', text: 'Viaje a El Chaltén por la Ruta 40.' },
      { title: 'Inicio del trekking en Río Eléctrico', text: 'Sendero por el bosque hacia la base del Fitz Roy.' },
      { title: 'Laguna de los Tres', text: 'Vista del Fitz Roy y del glaciar sobre la laguna.' },
      { title: 'Laguna Capri y El Chaltén', text: 'Regreso por otro sendero hasta el pueblo, donde te esperamos.' },
      { time: '21:00', title: 'Regreso a El Calafate', text: 'Llegada aproximada a tu hotel.' },
    ],
    options: [
      {
        name: 'Laguna de los Tres',
        description: 'Traslado ida y vuelta desde tu hospedaje en El Calafate.',
        departureTimes: ['07:00'],
        durationMinutes: 14 * 60,
        capacity: 20,
        tiers: [{ label: 'Por persona (16 o más años)', ageMin: 16, price: 33000 }],
      },
    ],
    extras: [],
    seo: {
      title: 'Trekking a la Laguna de los Tres desde El Calafate',
      description: 'Caminata de 22 km a la Laguna de los Tres, al pie del Fitz Roy, con traslado desde El Calafate y regreso por la Laguna Capri. Te esperamos hasta que vuelvas.',
      keywords: ['Laguna de los Tres', 'Fitz Roy', 'El Chaltén', 'trekking', 'Patagonia Argentina'],
    },
    photos: {
      folder: 'Trekking Laguna de Los Tres',
      enhance: true,
      alt: 'Laguna de los Tres y el Cerro Fitz Roy',
      pick: [29, 4, 28, 3, 2, 6, 5, 16, 8, 12],
    },
  },

  {
    slug: 'torres-del-paine',
    name: 'Torres del Paine desde El Calafate',
    category: 'excursiones-de-dia-completo',
    destination: null,
    summary:
      'Paine Adventure: circuito por el Parque Nacional Torres del Paine (Chile) con miradores, el Salto Grande y caminata al Mirador de los Cuernos.',
    durationMinutes: 15 * 60,
    difficulty: 'MODERATE',
    location: 'Parque Nacional Torres del Paine, Chile',
    languages: ['Español', 'Inglés'],
    mapMid: '12reBOQNdNrEJBNMU8gVWFle0qe8KH9k',
    highlights: [
      'Circuito circular: nunca se pasa dos veces por el mismo lugar',
      'Mirador Grey, Lago del Toro y el macizo Paine',
      'Sendero Miscelánea y caminata al Mirador de los Cuernos',
      'Salto Grande y fauna: guanacos, ñandúes, cóndores y, con suerte, el puma',
    ],
    included: [
      'Pick up desde tu alojamiento',
      'Guía certificado en Argentina y en Chile (español / inglés)',
      'Visita al Parque Nacional Torres del Paine con sus miradores',
      'Sendero Miscelánea, Salto Grande y caminata al Mirador de los Cuernos',
    ],
    excluded: ['Entrada al Parque Nacional Torres del Paine', 'Comidas'],
    description: `
**Paine Adventure** es la visita al Parque Nacional Torres del Paine (Chile) desde El Calafate, por un circuito en forma circular: nunca pasamos por el mismo lugar.

## El recorrido

La búsqueda por cada alojamiento comienza a las **6:30**. Cruzamos la estepa patagónica, con unos buenos mates, hasta la frontera de **Cancha Carrera**, donde hacemos los trámites migratorios de Argentina y Chile.

Seguimos por un camino de estancias con vistas al Cerro Castillo por la Bahía El Bote y, a orillas del lago más grande de la región, llegamos al **Mirador Grey**, la primera de muchas postales: el Lago del Toro y, de fondo, el macizo Paine con sus cumbres principales.

Entramos al Parque Nacional por la **Portería Río Serrano** (pago de entradas y baños) y hacemos nuestro primer trekking, el **sendero Miscelánea**, que sale del Centro Administrativo del Parque hacia un mirador con increíbles vistas al lago. En verano se ven muchas orquídeas. Al terminar, almorzamos en la **Playa Weber**, con la mejor vista del macizo.

Continuamos hacia los miradores del **Pehoé** y el **Salto Grande**, una poderosa cascada glaciaria, y caminamos hasta el **Mirador de los Cuernos**, con una cercanía absoluta a los Cuernos del Paine. El recorrido sigue por el **Lago Nordenskjöld** hacia la Portería Laguna Amarga, un tramo rico en fauna: guanacos, ñandúes, águilas y halcones; con suerte, cóndores y nuestra gran estrella, el puma.

Finalmente volvemos a la frontera, completamos los trámites migratorios y regresamos a El Calafate. Siempre hay algo más para fotografiar, así que las paradas suelen ser más.
`,
    importantInfo: `## Documentación obligatoria

Cada pasajero es responsable de llevar la documentación necesaria para cruzar la frontera:

- **Menores de 18 años:** deben viajar con autorización certificada por escribano y legalizada, salvo que viajen con ambos padres.
- Consultá si necesitás **visa para ingresar a Chile** antes de reservar.
- Completá la **Declaración Jurada de Migraciones** de Argentina (online).
- La reserva debe tener los datos completos de cada pasajero: nombre completo, fecha de nacimiento, nacionalidad y número de documento.

**No se reembolsa ningún importe si un pasajero no puede ingresar a Chile por un problema con su documentación.**

${SCHEDULE_NOTE}`,
    cancellationPolicy:
      'Sin cargo hasta 3 días antes de la excursión. Dentro de los 3 días previos se cobra el 100 % del valor.',
    freeCancellationHours: 72,
    itinerary: [
      { time: '06:30', title: 'Búsqueda por tu alojamiento', text: 'Cruce de la estepa patagónica hasta la frontera de Cancha Carrera.' },
      { title: 'Mirador Grey', text: 'Lago del Toro y el macizo Paine.' },
      { title: 'Sendero Miscelánea y almuerzo', text: 'Trekking con vista al lago y almuerzo en Playa Weber.' },
      { title: 'Pehoé, Salto Grande y Mirador de los Cuernos', text: 'Cascada glaciaria y caminata frente a los Cuernos del Paine.' },
      { title: 'Lago Nordenskjöld y Laguna Amarga', text: 'Tramo con fauna: guanacos, ñandúes y aves rapaces.' },
      { time: '21:30', title: 'Regreso a El Calafate', text: 'Trámites migratorios y llegada aproximada.' },
    ],
    options: [
      {
        name: 'Paine Adventure',
        description: 'Circuito completo con pick up desde tu alojamiento.',
        departureTimes: ['06:30'],
        durationMinutes: 15 * 60,
        capacity: 18,
        freeCancellationHours: 72,
        tiers: [{ label: 'Por persona', price: 46000 }],
      },
    ],
    extras: [],
    seo: {
      title: 'Torres del Paine desde El Calafate: excursión de día completo',
      description: 'Visitá el Parque Nacional Torres del Paine desde El Calafate: Mirador Grey, Salto Grande, Mirador de los Cuernos y fauna patagónica. Guía en Argentina y Chile.',
      keywords: ['Torres del Paine', 'El Calafate', 'Chile', 'excursión', 'Patagonia'],
    },
    photos: {
      folder: 'Torres del Paine',
      enhance: true,
      alt: 'Parque Nacional Torres del Paine',
      pick: [13, 5, 1, 2, 14, 16, 10, 7, 15, 17, 8],
    },
  },

  {
    slug: 'navegacion-todo-glaciares',
    name: 'Navegación Todo Glaciares: Upsala y Spegazzini',
    category: 'navegaciones',
    destination: 'lago-argentino',
    summary:
      'Navegación en catamarán entre témpanos hasta los glaciares Upsala, Spegazzini, Peineta, Heim y Seco, con desembarco en el refugio del Spegazzini.',
    durationMinutes: 11 * 60,
    difficulty: 'EASY',
    location: 'Puerto Punta Bandera, Lago Argentino',
    languages: ['Español', 'Inglés'],
    mapMid: '1LBcSCB6GXlp5Lk8_lPr9UJEpKCzBvHA',
    highlights: [
      'Navegación entre gigantescos témpanos del Lago Argentino',
      'Glaciar Upsala, uno de los más grandes de la Patagonia',
      'Desembarco frente al Glaciar Spegazzini, de 135 metros de altura',
      'Opción Captain Club: salón VIP del capitán con comida y bebidas libres',
    ],
    included: [
      'Navegación frente a los glaciares Upsala y Spegazzini',
      'Desembarco en el refugio del Glaciar Spegazzini',
      'Guía en español e inglés durante la navegación',
    ],
    excluded: [PARK_TICKET, 'Comidas (salvo con Captain Club)', 'Traslado desde tu hotel (podés sumarlo como opcional)'],
    description: `
## Una experiencia única para los amantes de la naturaleza

La excursión **Navegación Todo Glaciares** recorre algunos de los glaciares más imponentes de la Patagonia argentina.

Comienza en el puerto de **Punta Bandera**, a unos 47 km de El Calafate, donde abordás un moderno y cómodo catamarán para recorrer el Lago Argentino y los glaciares **Spegazzini, Upsala, Peineta, Heim y Seco**. Vas a navegar entre gigantescos témpanos, con guías que cuentan la historia y las características de cada glaciar.

## El desembarco

Una de las paradas más destacadas es el **Glaciar Spegazzini**, un muro de hielo de **135 metros de altura**. Allí hay un refugio donde se desciende para almorzar y ver el glaciar desde una perspectiva única, visitar el shop y caminar por los senderos para sacar fotos. También vas a conocer el **Glaciar Upsala**, con más de 800 km² de superficie.

## Captain Club

Para una visita más exclusiva, el **Captain Club** suma la navegación en el salón VIP del capitán, con comida y bebidas libres, y un salón privado en el refugio del Glaciar Spegazzini. Viajan como máximo 20 personas.

## Traslado

El recorrido dura aproximadamente 11 horas y no incluye la salida desde tu hotel: podés sumar el **traslado ida y vuelta desde tu hotel** como opcional.
`,
    importantInfo: SCHEDULE_NOTE,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la navegación.',
    itinerary: [
      { time: '08:30', title: 'Embarque en Puerto Punta Bandera', text: 'A 47 km de El Calafate. Si contrataste traslado, te buscamos antes por tu hotel.' },
      { title: 'Témpanos y Glaciar Upsala', text: 'Navegación por el Brazo Norte del Lago Argentino.' },
      { title: 'Desembarco en el Glaciar Spegazzini', text: 'Refugio, almuerzo, senderos y fotos frente al glaciar.' },
      { time: '16:00', title: 'Regreso a Puerto Punta Bandera', text: 'Fin de la navegación.' },
    ],
    options: [
      {
        name: 'Navegación Todo Glaciares',
        description: 'Embarque en Puerto Punta Bandera. Sumá el traslado o el Captain Club en «Opcionales».',
        departureTimes: ['08:30'],
        durationMinutes: 11 * 60,
        capacity: 60,
        tiers: [
          { label: 'Adultos (17 o más años)', ageMin: 17, price: 40800 },
          { label: 'Menores (6 a 16 años)', ageMin: 6, ageMax: 16, price: 36000 },
          { label: 'Menores (0 a 5 años)', ageMin: 0, ageMax: 5, price: 0 },
        ],
      },
    ],
    extras: [
      { name: 'Traslado desde tu hotel al puerto', description: 'Búsqueda y regreso a tu hotel en El Calafate.', price: 7500 },
      { name: 'Upgrade Captain Club', description: 'Salón VIP del capitán (máx. 20 personas) con comida y bebidas libres, y salón privado en el refugio del Spegazzini.', price: 25200 },
    ],
    seo: {
      title: 'Navegación Todo Glaciares: Upsala y Spegazzini',
      description: 'Navegá en catamarán entre témpanos hasta los glaciares Upsala y Spegazzini, con desembarco en el refugio. Opción Captain Club y traslado desde tu hotel.',
      keywords: ['Navegación Todo Glaciares', 'Spegazzini', 'Upsala', 'glaciares', 'Patagonia Argentina', 'excursión'],
    },
    photos: {
      folder: 'TodoGlaciaresFotos',
      enhance: false,
      alt: 'Navegación Todo Glaciares por el Lago Argentino',
      pick: [39, 25, 30, 15, 19, 21, 28, 22, 36, 23, 32, 38, 41, 6, 3, 5],
    },
  },

  {
    slug: 'safari-nautico-perito-moreno',
    name: 'Navegación Safari Náutico',
    category: 'navegaciones',
    destination: 'glaciar-perito-moreno',
    summary:
      'Una hora de navegación por el Brazo Rico frente a la pared sur del Glaciar Perito Moreno, a solo 400 metros del hielo.',
    durationMinutes: 60,
    difficulty: 'EASY',
    location: 'Puerto Bajo de las Sombras, Ruta 11 km 70,9',
    languages: ['Español', 'Inglés'],
    mapMid: '1IS47zSM0ejHqM_Z7ATU024iMhSlzcTk',
    highlights: [
      'A 400 metros de la pared sur del glaciar',
      'Perspectiva única de los desprendimientos de hielo',
      'Apta para todas las edades, los 365 días del año',
      'Opcional: traslado desde tu hotel con visita a las pasarelas',
    ],
    included: ['Navegación de una hora frente al Glaciar Perito Moreno', 'Guía del Parque durante la navegación'],
    excluded: [PARK_TICKET, 'Comidas y bebidas', 'Traslado desde tu hotel (podés sumarlo como opcional)'],
    description: `
La excursión comienza en el puerto **Bajo de las Sombras**, sobre la Ruta 11 (km 70,9), a una hora y media de El Calafate y a solo 7 km del glaciar. Desde allí se navega por el **Lago Rico**, frente a la impresionante pared de hielo del Glaciar Perito Moreno y los témpanos que se desprenden de ella.

## Más cerca, imposible

La navegación dura **una hora** y ofrece, desde embarcaciones confortables, una perspectiva totalmente distinta de las paredes del glaciar y de sus continuos y estruendosos derrumbes. A **400 metros de la pared sur**, el barco se detiene unos minutos para observar el paisaje en detalle.

Es una navegación **apta para todas las edades** que se realiza los **365 días del año**, pensada para quienes quieren contemplar la magia del hielo y guardarla en la memoria.

## Qué llevar

Ropa cómoda y abrigada: campera, calzado deportivo o botas de trekking, lentes de sol, protector solar, guantes y gorro. Llevá comida y bebida para el día: la empresa no vende alimentos.
`,
    importantInfo: `Los horarios de salida (10:00, 11:30 y 14:30) se confirman el día anterior a la navegación según disponibilidad.

Para llegar por tus medios necesitás la entrada al Parque Nacional («Acceso Corredor Río Mitre y Glaciar Perito Moreno»), que se compra online o se abona en efectivo al ingresar.`,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la navegación.',
    itinerary: [
      { title: 'Puerto Bajo de las Sombras', text: 'Embarque a 7 km del glaciar. Salidas a las 10:00, 11:30 y 14:30.' },
      { title: 'Navegación por el Lago Rico', text: 'Una hora frente a la pared sur del Perito Moreno, con parada a 400 m del hielo.' },
      { title: 'Opcional: pasarelas', text: 'Con el traslado desde tu hotel, sumás la visita a las pasarelas.' },
    ],
    options: [
      {
        name: 'Safari Náutico',
        description: 'Encuentro en Puerto Bajo de las Sombras. Sumá el traslado con visita a pasarelas en «Opcionales».',
        departureTimes: ['10:00', '11:30', '14:30'],
        durationMinutes: 60,
        capacity: 80,
        tiers: [
          { label: 'Adultos (16 o más años)', ageMin: 16, price: 10000 },
          { label: 'Menores (4 a 15 años)', ageMin: 4, ageMax: 15, price: 8500 },
          { label: 'Menores (0 a 3 años)', ageMin: 0, ageMax: 3, price: 0 },
        ],
      },
    ],
    extras: [
      { name: 'Traslado desde tu hotel + visita a las pasarelas', description: 'Búsqueda y regreso a tu hotel, con visita a las pasarelas del glaciar.', price: 12000 },
    ],
    seo: {
      title: 'Navegación Safari Náutico frente al Glaciar Perito Moreno',
      description: 'Una hora de navegación frente a la pared sur del Perito Moreno, a 400 m del hielo. Salidas 10:00, 11:30 y 14:30, todo el año. Apta para todas las edades.',
      keywords: ['Safari Náutico', 'Glaciar Perito Moreno', 'navegación', 'El Calafate'],
    },
    photos: {
      folder: 'Safari Nautico',
      enhance: false,
      alt: 'Navegación Safari Náutico frente al Glaciar Perito Moreno',
      pick: [7, 1, 2, 3, 4, 5],
    },
  },

  {
    slug: 'safari-azul',
    name: 'Safari Azul: tocá el glaciar',
    category: 'navegaciones',
    destination: 'glaciar-perito-moreno',
    summary:
      'Navegación por el Lago Rico y caminata por la costa hasta tocar el hielo del Glaciar Perito Moreno, con un guía experimentado.',
    durationMinutes: 3 * 60,
    difficulty: 'EASY',
    location: 'Puerto Bajo de las Sombras, Parque Nacional Los Glaciares',
    minAge: 6,
    maxAge: 70,
    languages: ['Español', 'Inglés'],
    mapMid: '1YBpvdVas6vZ66p75qL5gpeZtgithLfQ',
    highlights: [
      'Caminata por la costa y el bosque con vista a la pared sur',
      'La experiencia de tocar el hielo del Perito Moreno',
      'Navegación a pocos metros de la cara sur del glaciar',
      'Con traslado: una hora en las pasarelas',
    ],
    included: ['Embarque en Puerto Bajo de las Sombras', 'Caminata por la costa hasta el glaciar con guía', 'Navegación de regreso al puerto'],
    excluded: [
      'Caminata sobre el glaciar (no es un minitrekking)',
      PARK_TICKET,
      'Comidas y bebidas',
      'Indumentaria apropiada para el clima',
      'Traslado y visita a las pasarelas (podés sumarlos como opcional)',
    ],
    description: `
El **Safari Azul** está pensado para quienes, además de navegar frente al Glaciar Perito Moreno, sueñan con **acercarse y tocar el hielo**.

## Qué vas a hacer

La excursión comienza en **Puerto Bajo de las Sombras**, a solo 7 km de las pasarelas. Tomamos un barco para cruzar el Lago Rico y, tras 20 minutos de navegación, desembarcamos en la costa opuesta. Caminamos unos 30 minutos siempre con vista a la pared sur del glaciar, por si nos sorprende algún desprendimiento.

Una vez al lado del hielo llega el momento inolvidable: **tocar el Glaciar Perito Moreno** y disfrutar de sus intensos azules y blancos y de sus caprichosas formas. Hay tiempo para muchas fotos antes de volver al embarque, siempre acompañados por un guía experimentado.

La caminata total dura aproximadamente **1 h 30 min**: un kilómetro y medio por la costa del lago y un frondoso bosque, sobre terreno natural de arena y piedras, con algunas pendientes y escaleras. Al final, el barco recorre de cerca toda la cara sur del glaciar.

## Con traslado

Si contratás el traslado, al volver al puerto tomamos el bus hacia las **pasarelas**, donde tenés una hora para disfrutar la vista panorámica y comer la vianda que traigas desde El Calafate.

## Qué llevar

Ropa cómoda y abrigada: campera y pantalón impermeables, calzado deportivo o botas de trekking impermeables, lentes de sol, protector solar, guantes y gorro. Llevá comida y bebida para el día: la empresa no vende alimentos.
`,
    importantInfo: `**Edad: de 6 a 70 años.** La intensidad es baja, pero el terreno tiene piedras, pendientes suaves y escaleras.

La visita a las pasarelas se incluye únicamente contratando el traslado con nosotros.

${SCHEDULE_NOTE}`,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la excursión.',
    itinerary: [
      { time: '08:00', title: 'Búsqueda por tu hotel (si contrataste traslado)', text: 'Salida hacia el Parque Nacional.' },
      { time: '10:00', title: 'Navegación desde Puerto Bajo de las Sombras', text: 'Cruce del Lago Rico y desembarco en la costa opuesta.' },
      { title: 'Caminata y contacto con el hielo', text: 'Por la costa y el bosque hasta tocar el glaciar, con guía.' },
      { time: '13:30', title: 'Visita a las pasarelas (con traslado)', text: 'Una hora en los miradores frente al glaciar.' },
      { time: '16:30', title: 'Regreso a El Calafate', text: 'Llegada aproximada a tu hotel.' },
    ],
    options: [
      {
        name: 'Safari Azul',
        description: 'Comienza en Puerto Bajo de las Sombras; duración 3 h. Con traslado, 8 h desde tu hotel.',
        departureTimes: ['10:00'],
        durationMinutes: 3 * 60,
        capacity: 30,
        tiers: [
          { label: 'Adultos (16 a 70 años)', ageMin: 16, ageMax: 70, price: 24000 },
          { label: 'Menores (6 a 15 años)', ageMin: 6, ageMax: 15, price: 19000 },
        ],
      },
    ],
    extras: [
      { name: 'Traslado desde tu hotel + visita a las pasarelas', description: 'Traslado a Puerto Bajo de las Sombras (70 km), con una hora de visita a las pasarelas del glaciar.', price: 10000 },
    ],
    seo: {
      title: 'Safari Azul: tocá el Glaciar Perito Moreno',
      description: 'Navegación por el Lago Rico y caminata por la costa hasta tocar el hielo del Perito Moreno. De 6 a 70 años. Opción con traslado y visita a pasarelas.',
      keywords: ['Safari Azul', 'tocar el glaciar', 'Glaciar Perito Moreno', 'navegación', 'El Calafate'],
    },
    photos: {
      folder: 'Safari Azul',
      enhance: false,
      alt: 'Safari Azul: caminata hasta el Glaciar Perito Moreno',
      pick: [2, 5, 3, 4, 1],
    },
  },

  {
    slug: 'glaciares-gourmet',
    name: 'Navegación Glaciares Gourmet',
    category: 'navegaciones',
    destination: 'lago-argentino',
    summary:
      'Navegación frente a los glaciares Upsala, Spegazzini, Seco y Perito Moreno, con desembarco en Puesto de las Vacas y vianda gourmet opcional.',
    durationMinutes: 9 * 60,
    difficulty: 'EASY',
    location: 'Puerto La Soledad, Lago Argentino',
    languages: ['Español', 'Inglés'],
    mapMid: '1CZKKfUW1JDPYswMg1gl_1V9Lscia3Ig',
    highlights: [
      'Glaciares Upsala, Spegazzini, Seco y Perito Moreno en una sola navegación',
      'Desembarco en Puesto de las Vacas, un antiguo puesto de estancia',
      'Vianda gourmet a bordo con sándwich de cordero patagónico',
      'Salón VIP a bordo para un máximo de 12 personas',
    ],
    included: [
      'Navegación frente a los glaciares Upsala, Spegazzini y Perito Moreno',
      'Desembarco en Puesto de las Vacas',
      'Guía durante la navegación',
      'Seguro',
      'Acceso para sillas de ruedas o movilidad reducida (con acompañante)',
    ],
    excluded: [PARK_TICKET, 'Vianda gourmet (podés sumarla como opcional)', 'Traslado desde tu hotel (podés sumarlo como opcional)'],
    description: `
## Explorá los glaciares y el sabor de la Patagonia

En esta navegación vas a conocer algunos de los glaciares más impresionantes de la región: el **Upsala**, el **Spegazzini**, el **Seco** y el **Perito Moreno**. También hacemos un desembarco en **Puesto de las Vacas**, un antiguo puesto de estancia.

## La vianda gourmet

A bordo podés disfrutar de una experiencia culinaria sin igual: **sándwich de cordero** con mostaza casera, queso criollo y cebollas caramelizadas, acompañado de papas horneadas y quesos ahumados. De postre, **mousse de caramelo** con algarroba crocante y conserva de frutos rojos. Incluye bebida sin alcohol. Tiene un costo adicional a la navegación.

## Salón VIP

Para una experiencia premium, el **Salón VIP a bordo** (máximo 12 personas) incluye almuerzo gourmet premium y bebidas con y sin alcohol.

## El clima

Puede ser impredecible, aunque en verano (de diciembre a marzo) suele ser fresco y seco. Llevá abrigo para estar preparado.

## Traslado

La navegación comienza en **Puerto La Soledad**, a 50 km de El Calafate. Si preferís que te busquemos en tu hotel, sumá el **traslado ida y vuelta** como opcional.
`,
    importantInfo: `Llevá tu DNI, pasaporte o cédula de identidad, y cámara de fotos (los drones no están permitidos en el Parque).

${NO_RECEPTION_NOTE}

${SCHEDULE_NOTE}`,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la navegación.',
    itinerary: [
      { time: '07:00', title: 'Búsqueda por tu hotel (si contrataste traslado)', text: 'Viaje hasta Puerto La Soledad.' },
      { time: '08:30', title: 'Embarque en Puerto La Soledad', text: 'Inicio de la navegación por el Lago Argentino.' },
      { title: 'Upsala, Spegazzini, Seco y Perito Moreno', text: 'Navegación frente a los glaciares, con vianda gourmet a bordo si la sumaste.' },
      { title: 'Desembarco en Puesto de las Vacas', text: 'Visita a un antiguo puesto de estancia.' },
      { time: '17:00', title: 'Regreso a Puerto La Soledad', text: 'Fin de la navegación.' },
    ],
    options: [
      {
        name: 'Glaciares Gourmet',
        description: 'Embarque a las 8:30 en Puerto La Soledad. Sumá vianda, salón VIP o traslado en «Opcionales».',
        departureTimes: ['08:30'],
        durationMinutes: 9 * 60,
        capacity: 60,
        tiers: [
          { label: 'Adultos (16 o más años)', ageMin: 16, price: 42500 },
          { label: 'Menores (6 a 15 años)', ageMin: 6, ageMax: 15, price: 21250 },
          { label: 'Menores (0 a 5 años)', ageMin: 0, ageMax: 5, price: 0 },
        ],
      },
    ],
    extras: [
      { name: 'Vianda gourmet', description: 'Sándwich de cordero con mostaza casera, queso criollo y cebollas caramelizadas, papas horneadas, quesos ahumados, mousse de caramelo y bebida sin alcohol.', price: 5000 },
      { name: 'Acceso al Salón VIP', description: 'Salón VIP a bordo (máx. 12 personas) con almuerzo gourmet premium y bebidas con y sin alcohol.', price: 36500 },
      { name: 'Traslado desde tu hotel al puerto', description: 'Búsqueda desde las 7:00 y regreso a tu hotel en El Calafate.', price: 8000 },
    ],
    seo: {
      title: 'Navegación Glaciares Gourmet en el Lago Argentino',
      description: 'Navegá frente a los glaciares Upsala, Spegazzini, Seco y Perito Moreno, con desembarco en Puesto de las Vacas, vianda gourmet y opción Salón VIP.',
      keywords: ['Glaciares Gourmet', 'navegación', 'Glaciar Upsala', 'Glaciar Spegazzini', 'Puesto de las Vacas', 'comida gourmet'],
    },
    photos: {
      folder: 'GlaciaresGourmet',
      enhance: false,
      alt: 'Navegación Glaciares Gourmet',
      pick: [24, 1, 3, 6, 7, 8, 13, 14, 15, 17, 18, 19, 20, 21, 22],
    },
  },

  {
    slug: 'aventuras-cerro-frias',
    previousSlugs: ['trekking-cerro-frias'],
    name: 'Cerro Frías | El Calafate',
    category: 'aventura',
    destination: 'el-calafate',
    summary:
      'Aventura en la Estancia Alice: elegí cabalgata, tirolesa, tour 4x4 o trekking en el Cerro Frías, con vistas al Lago Argentino. Incluye comida y traslado.',
    durationMinutes: 4 * 60,
    difficulty: 'EASY',
    location: 'Estancia Alice, a 23 km de El Calafate',
    languages: ['Español', 'Inglés'],
    mapMid: '1NgRsgjAOhE5puNZg7bexEZYqn6EFtJM',
    highlights: [
      'Elegí tu actividad: cabalgata, tirolesa, 4x4 o trekking',
      'Vistas del Lago Argentino, los Andes, el Fitz Roy y Torres del Paine',
      '2350 metros de tirolesa en 5 vías',
      'Incluye almuerzo o cena en el quincho de la estancia',
    ],
    included: ['Traslado desde tu hotel', 'Una actividad guiada a elección', 'Almuerzo o cena, según el horario', 'Equipo de seguridad (tirolesa)'],
    excluded: [],
    description: `
## Aventura en la Patagonia

El **Cerro Frías** (1095 m s. n. m.) se levanta aislado en medio de un valle y regala, durante el ascenso, vistas panorámicas espectaculares del **Valle del Centinela**, la **Cordillera de los Andes** y el **Lago Argentino**. En el horizonte se destacan el Cordón de los Cristales y las Torres del Paine al sur, las penínsulas de Magallanes y Avellaneda al oeste y, al norte, el Cerro Fitz Roy.

Está dentro de la **Estancia Alice**, a 23 km de El Calafate camino al Glaciar Perito Moreno: una gran oportunidad para ver flora y fauna silvestre, animales de estancia y el bosque de lengas de la ladera este.

## Elegí tu actividad

Las cuatro actividades guiadas se hacen al mismo tiempo por distintos circuitos, así que integrantes de un mismo grupo pueden elegir actividades diferentes: todos se reencuentran en el **quincho de la Estancia Alice** antes de volver. **Cada pasajero elige una sola actividad.**

### Tour 4x4

Ascendemos por caminos de montaña con vistas al Lago Argentino. A los 20 minutos paramos en el primer mirador (450 m), sobre el valle del Río Centinela, y seguimos hasta el segundo mirador (1030 m), con vistas a Torres del Paine, los brazos Rico y Sur del Lago Argentino, el Lago Roca, el Canal de los Témpanos, la Boca del Diablo y, si el clima lo permite, el Fitz Roy. Descendemos por el bosque de lengas hasta el quincho.

### Cabalgata o trekking

Atravesamos un mallín y subimos por los faldeos de la montaña. A los 30 minutos ya se ven el Valle del Centinela y las Torres del Paine. Seguimos hasta los campos altos del cerro, donde pueden verse vacas de la estancia y animales silvestres como guanacos, liebres, zorros, armadillos y zorrinos. Luego descendemos hasta el quincho.

### Tirolesa

En el quincho te equipamos y recibís una charla de seguridad. Subimos a la plataforma, a 540 metros en la ladera sur, y cruzamos **2350 metros de cable en 5 vías**, con vistas a Torres del Paine, el Valle del Centinela, el Lago Roca y el Brazo Rico.

## Recomendaciones

Abrigo (gorro, guantes, campera e impermeable), lentes y protector solar.
`,
    importantInfo: `Duración: 4 horas. Dificultad: fácil. El traslado desde tu hotel está incluido.

Hay menú vegetariano para quienes lo pidan con anticipación: indicalo en los comentarios de la reserva.

${SCHEDULE_NOTE}`,
    cancellationPolicy: 'Cancelación sin cargo hasta 24 horas antes de la excursión.',
    itinerary: [
      { title: 'Búsqueda por tu hotel', text: 'Traslado a la Estancia Alice, a 23 km de El Calafate.' },
      { title: 'Tu actividad en el Cerro Frías', text: 'Cabalgata, tirolesa, 4x4 o trekking, con guía.' },
      { title: 'Quincho de la Estancia Alice', text: 'Almuerzo o cena, según el horario.' },
      { title: 'Regreso a El Calafate', text: 'Traslado a tu hotel.' },
    ],
    // One option per activity: the customer picks exactly one.
    options: ['Cabalgata', 'Tirolesa', 'Tour 4x4', 'Trekking'].map((activity) => ({
      name: activity,
      description: {
        Cabalgata: 'Cabalgata guiada por los faldeos del Cerro Frías hasta sus campos altos.',
        Tirolesa: '2350 m de cable en 5 vías, con equipo de seguridad y charla previa.',
        'Tour 4x4': 'Ascenso en vehículo 4x4 hasta el mirador de 1030 m y descenso por el bosque de lengas.',
        Trekking: 'Caminata guiada por los faldeos del Cerro Frías hasta sus campos altos.',
      }[activity],
      departureTimes: ['08:30', '14:00', '18:30'],
      durationMinutes: 4 * 60,
      capacity: 20,
      tiers: [
        { label: 'Adultos (12 o más años)', ageMin: 12, price: 21500 },
        { label: 'Menores (3 a 11 años)', ageMin: 3, ageMax: 11, price: 10750 },
      ],
    })),
    extras: [],
    seo: {
      title: 'Cerro Frías | El Calafate: cabalgata, tirolesa, 4x4 o trekking',
      description: 'Aventura en el Cerro Frías, a 23 km de El Calafate: elegí cabalgata, tirolesa, 4x4 o trekking, con vistas al Lago Argentino. Incluye comida y traslado.',
      keywords: ['Cerro Frías', 'cabalgata', 'tirolesa', '4x4', 'trekking', 'El Calafate'],
    },
    photos: {
      folder: 'CerroFrias',
      enhance: false,
      alt: 'Aventura en el Cerro Frías',
      pick: [6, 7, 8, 5, 1, 2, 3, 10, 11, 12, 9, 13, 14],
    },
  },
]


// ─────────────────────────────────────────────────────────────────────────────
// FAQs — every answer comes from the brief. They replace the placeholder FAQs,
// some of which contradicted it (e.g. Minitrekking ages).
// ─────────────────────────────────────────────────────────────────────────────

const FAQS = {
  'glaciar-perito-moreno-pasarelas': [
    ['¿La entrada al Parque Nacional está incluida?', 'No. Se compra online en ventaweb.apn.gob.ar o se abona en efectivo, en pesos, al ingresar al Parque.'],
    ['¿Puedo sumar una navegación?', 'Sí. Al reservar podés agregar la Navegación Safari Náutico (una hora frente al glaciar) o el Safari Azul, que suma una caminata por la costa hasta tocar el hielo.'],
    ['¿Las pasarelas abren en invierno?', 'Sí, abren todo el año. En invierno las temperaturas pueden estar bajo cero: llevá abrigo, guantes y bufanda.'],
  ],
  'minitrekking-perito-moreno': [
    ['¿Cuál es la edad permitida?', 'De 8 a 65 años. Por exigencia del operador, otras edades no pueden realizar la actividad.'],
    ['¿Quiénes no pueden participar?', 'Mujeres embarazadas, personas con problemas cardíacos y personas recién operadas.'],
    ['¿Incluye comida?', 'No. Llevá tu vianda y una botella para el agua: no hay dónde comprar comida.'],
    ['¿Incluye el traslado desde el hotel?', 'No, pero podés sumarlo al reservar. El traslado incluye además una hora de visita a las pasarelas del glaciar.'],
  ],
  'el-chalten-trekking-libre': [
    ['¿Cuánto tiempo tengo en El Chaltén?', 'Cinco horas libres para hacer trekking.'],
    ['¿Hay una caminata tranquila?', 'Sí: el Mirador de los Cóndores y el Chorrillo del Salto son una buena opción para un trekking tranquilo.'],
    ['¿Está incluido el almuerzo?', 'Es opcional: podés sumarlo al reservar, llevar tu vianda o comprar comida en el pueblo.'],
    ['¿Se ve siempre el Fitz Roy?', 'Depende del clima, que en la montaña cambia de repente. No es posible garantizar la visibilidad.'],
  ],
  'trekking-laguna-de-los-tres': [
    ['¿Necesito guía?', 'No. Los senderos son autoguiados y están señalizados: te damos las indicaciones y los mapas. Para tu tranquilidad, no nos vamos hasta que vuelvas.'],
    ['¿Qué distancia y duración tiene?', 'Unos 22 km y alrededor de 8 horas de caminata, comenzando en Río Eléctrico y regresando por la Laguna Capri.'],
    ['¿Desde qué edad se puede hacer?', 'Desde los 16 años. No es apto para personas en silla de ruedas, con movilidad reducida ni embarazadas.'],
  ],
  'torres-del-paine': [
    ['¿Qué documentación necesito?', 'Tu documento o pasaporte vigente y la Declaración Jurada de Migraciones de Argentina. Los menores de 18 años que no viajen con ambos padres necesitan autorización certificada por escribano y legalizada. Consultá si necesitás visa para Chile.'],
    ['¿La entrada al Parque Nacional está incluida?', 'No. La entrada al Parque Nacional Torres del Paine se abona aparte, igual que las comidas.'],
    ['¿Qué pasa si no puedo ingresar a Chile?', 'No se reembolsa ningún importe si un pasajero no puede ingresar por un problema con su documentación.'],
    ['¿Hasta cuándo puedo cancelar?', 'Sin cargo hasta 3 días antes de la excursión. Dentro de los 3 días previos se cobra el 100 % del valor.'],
  ],
  'navegacion-todo-glaciares': [
    ['¿Hay desembarco?', 'Sí, en el refugio del Glaciar Spegazzini, donde se puede almorzar, visitar el shop y caminar por los senderos.'],
    ['¿Qué es el Captain Club?', 'Un upgrade para viajar en el salón VIP del capitán (máximo 20 personas), con comida y bebidas libres y un salón privado en el refugio del Spegazzini.'],
    ['¿Pagan los niños?', 'Los menores de 0 a 5 años viajan gratis; de 6 a 16 años tienen tarifa de menor.'],
  ],
  'safari-nautico-perito-moreno': [
    ['¿Cuánto dura la navegación?', 'Una hora, frente a la pared sur del glaciar, con una parada a 400 metros del hielo.'],
    ['¿Qué horarios tiene?', 'Salidas a las 10:00, 11:30 y 14:30. Los horarios se confirman el día anterior según disponibilidad.'],
    ['¿Incluye el traslado?', 'No, pero podés sumarlo al reservar: incluye el traslado desde tu hotel y la visita a las pasarelas.'],
  ],
  'safari-azul': [
    ['¿Es un minitrekking?', 'No. No se camina sobre el glaciar: se camina por la costa del lago hasta tocar el hielo.'],
    ['¿Cuál es la edad permitida?', 'De 6 a 70 años.'],
    ['¿Incluye la visita a las pasarelas?', 'Solo si contratás el traslado con nosotros: en ese caso tenés una hora en las pasarelas.'],
  ],
  'glaciares-gourmet': [
    ['¿Qué incluye la vianda gourmet?', 'Sándwich de cordero con mostaza casera, queso criollo y cebollas caramelizadas, papas horneadas, quesos ahumados, mousse de caramelo y bebida sin alcohol. Tiene un costo adicional.'],
    ['¿Qué es el Salón VIP?', 'Un salón a bordo para un máximo de 12 personas, con almuerzo gourmet premium y bebidas con y sin alcohol.'],
    ['¿Es accesible?', 'Sí, para personas en silla de ruedas o con movilidad reducida, que deben viajar con un acompañante.'],
  ],
  'aventuras-cerro-frias': [
    ['¿Puedo hacer más de una actividad?', 'No: cada pasajero elige una sola actividad. Un mismo grupo puede elegir actividades distintas y se reencuentra en el quincho de la estancia.'],
    ['¿Incluye comida?', 'Sí, almuerzo o cena según el horario. Hay menú vegetariano si lo pedís con anticipación.'],
    ['¿Siempre se ven las Torres del Paine?', 'Depende de la visibilidad del día, que en la región es muy variable.'],
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Photos
// ─────────────────────────────────────────────────────────────────────────────

async function listImages(dir) {
  const out = []
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name)
    if ((await stat(full)).isDirectory()) out.push(...(await listImages(full)))
    else if (/\.(jpe?g|png|webp)$/i.test(name)) out.push(full)
  }
  return out.sort()
}

/**
 * Resizes to at most 2000px on the long edge and encodes WebP. `enhance`
 * applies a gentle lift — a touch of brightness, contrast and saturation —
 * enough to fix flat phone exposures without looking processed.
 */
async function processImage(file, enhance) {
  let pipeline = sharp(file).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
  if (enhance) {
    pipeline = pipeline.modulate({ brightness: 1.05, saturation: 1.15 }).linear(1.06, -6).sharpen({ sigma: 0.6 })
  }
  const { data, info } = await pipeline.webp({ quality: 82, effort: 5 }).toBuffer({ resolveWithObject: true })
  const blur = await sharp(data).resize(16).webp({ quality: 40 }).toBuffer()
  return { data, width: info.width, height: info.height, blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}` }
}

async function importPhotos(tour) {
  const files = await listImages(path.join(PHOTOS, tour.photos.folder))
  const ids = []
  for (const [position, index] of tour.photos.pick.entries()) {
    const file = files[index - 1]
    if (!file) {
      console.log(`  ! ${tour.slug}: no photo #${index}`)
      continue
    }
    const relative = path.relative(PHOTOS, file)
    const sourceKey = `drive:miexcursion/${relative}`

    const existing = await prisma.media.findFirst({ where: { sourceUrl: sourceKey }, select: { id: true } })
    if (existing) {
      ids.push(existing.id)
      continue
    }

    const image = await processImage(file, tour.photos.enhance)
    const now = new Date()
    const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.webp`
    await mkdir(path.dirname(path.join(STORAGE, key)), { recursive: true })
    await writeFile(path.join(STORAGE, key), image.data)

    const media = await prisma.media.create({
      data: {
        type: 'IMAGE',
        storageKey: key,
        url: `${PUBLIC_BASE}/${key}`,
        filename: `${tour.slug}-${String(position + 1).padStart(2, '0')}.webp`,
        mimeType: 'image/webp',
        size: image.data.byteLength,
        width: image.width,
        height: image.height,
        blurDataUrl: image.blurDataUrl,
        altText: position === 0 ? tour.photos.alt : `${tour.photos.alt} (foto ${position + 1})`,
        // Our own photographs: no licence string, so no on-site credit.
        license: null,
        sourceUrl: sourceKey,
        caption: null,
      },
      select: { id: true },
    })
    ids.push(media.id)
  }
  return ids
}

// ─────────────────────────────────────────────────────────────────────────────
// Load
// ─────────────────────────────────────────────────────────────────────────────

const markdown = (text) => text.trim()
const hash = (text) => createHash('sha1').update(text).digest('hex').slice(0, 8)

async function main() {
  if (!STORAGE || !PUBLIC_BASE) throw new Error('STORAGE_LOCAL_DIR and STORAGE_PUBLIC_URL must be set')

  // Categories
  const categoryIds = {}
  for (const category of CATEGORIES) {
    const row = await prisma.tourCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, sortOrder: category.sortOrder, status: 'PUBLISHED', channel: 'excursiones' },
      create: { ...category, status: 'PUBLISHED', channel: 'excursiones' },
      select: { id: true },
    })
    categoryIds[category.slug] = row.id
  }

  const destinations = Object.fromEntries(
    (await prisma.destination.findMany({ select: { id: true, slug: true } })).map((d) => [d.slug, d.id]),
  )

  const catalogueSlugs = new Set(TOURS.map((t) => t.slug))
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()))

  for (const [order, tour] of TOURS.entries()) {
    console.log(`→ ${tour.name}`)
    const existing = await prisma.tour.findFirst({
      where: { slug: { in: [tour.slug, ...(tour.previousSlugs ?? [])] } },
      select: { id: true, seoId: true },
    })

    const data = {
      slug: tour.slug,
      name: tour.name,
      summary: tour.summary,
      description: markdown(tour.description),
      status: 'PUBLISHED',
      publishedAt: new Date(),
      categoryId: categoryIds[tour.category],
      destinationId: tour.destination ? (destinations[tour.destination] ?? null) : null,
      durationMinutes: tour.durationMinutes,
      difficulty: tour.difficulty,
      location: tour.location,
      minAge: tour.minAge ?? null,
      maxAge: tour.maxAge ?? null,
      maxGroupSize: null,
      languages: tour.languages,
      highlights: tour.highlights,
      included: tour.included,
      excluded: tour.excluded,
      importantInfo: markdown(tour.importantInfo),
      cancellationPolicy: tour.cancellationPolicy,
      mapEmbedUrl: map(tour.mapMid),
      featured: order < 6,
      sortOrder: order + 1,
      isDemo: false,
      fromPriceCents: ARS(Math.min(...tour.options.map((o) => o.tiers[0].price))),
      currency: 'ARS',
      archivedAt: null,
    }

    const saved = existing
      ? await prisma.tour.update({ where: { id: existing.id }, data, select: { id: true, seoId: true } })
      : await prisma.tour.create({ data, select: { id: true, seoId: true } })
    const tourId = saved.id

    // SEO
    const seoData = { title: tour.seo.title, description: tour.seo.description, ogTitle: tour.seo.title, ogDescription: tour.seo.description }
    if (saved.seoId) await prisma.seoMetadata.update({ where: { id: saved.seoId }, data: seoData })
    else {
      const seo = await prisma.seoMetadata.create({ data: seoData, select: { id: true } })
      await prisma.tour.update({ where: { id: tourId }, data: { seoId: seo.id } })
    }

    // Options and their bands: previous options are deactivated, never
    // deleted, so any booking that references them keeps its history.
    await prisma.tourOption.updateMany({ where: { tourId }, data: { isActive: false } })
    for (const [optionIndex, option] of tour.options.entries()) {
      const optionData = {
        name: option.name,
        description: option.description,
        priceCents: ARS(option.tiers[0].price),
        childPriceCents: option.tiers[1] ? ARS(option.tiers[1].price) : null,
        currency: 'ARS',
        durationMinutes: option.durationMinutes,
        capacity: option.capacity,
        minParticipants: 1,
        maxParticipants: Math.min(option.capacity, 30),
        pickupIncluded: false,
        departureTimes: option.departureTimes,
        freeCancellationHours: option.freeCancellationHours ?? tour.freeCancellationHours ?? 24,
        isActive: true,
        sortOrder: optionIndex,
      }
      const match = await prisma.tourOption.findFirst({ where: { tourId, name: option.name }, select: { id: true } })
      const optionId = match
        ? (await prisma.tourOption.update({ where: { id: match.id }, data: optionData, select: { id: true } })).id
        : (await prisma.tourOption.create({ data: { ...optionData, tourId }, select: { id: true } })).id

      await prisma.tourPriceTier.updateMany({ where: { optionId }, data: { isActive: false } })
      for (const [tierIndex, tier] of option.tiers.entries()) {
        const tierData = {
          label: tier.label,
          ageMin: tier.ageMin ?? null,
          ageMax: tier.ageMax ?? null,
          priceCents: ARS(tier.price),
          isActive: true,
          sortOrder: tierIndex,
        }
        const tierMatch = await prisma.tourPriceTier.findFirst({ where: { optionId, label: tier.label }, select: { id: true } })
        if (tierMatch) await prisma.tourPriceTier.update({ where: { id: tierMatch.id }, data: tierData })
        else await prisma.tourPriceTier.create({ data: { ...tierData, optionId } })
      }

      // A year of departures. Existing rows (and their bookings) are kept.
      const rows = []
      for (let day = 1; day <= 365; day++) {
        const date = new Date(today.getTime() + day * 86_400_000)
        for (const time of option.departureTimes.length ? option.departureTimes : [null]) {
          rows.push({ tourId, optionId, date, departureTime: time, seatsTotal: option.capacity, seatsBooked: 0 })
        }
      }
      await prisma.tourAvailability.createMany({ data: rows, skipDuplicates: true })
    }

    // Extras
    await prisma.tourExtra.updateMany({ where: { tourId }, data: { isActive: false } })
    for (const [extraIndex, extra] of tour.extras.entries()) {
      const extraData = {
        name: extra.name,
        description: extra.description,
        priceCents: ARS(extra.price),
        perPerson: extra.perPerson ?? true,
        isActive: true,
        sortOrder: extraIndex,
      }
      const match = await prisma.tourExtra.findFirst({ where: { tourId, name: extra.name }, select: { id: true } })
      if (match) await prisma.tourExtra.update({ where: { id: match.id }, data: extraData })
      else await prisma.tourExtra.create({ data: { ...extraData, tourId } })
    }

    // Itinerary: carries no foreign keys, so it is replaced.
    await prisma.tourItineraryStep.deleteMany({ where: { tourId } })
    await prisma.tourItineraryStep.createMany({
      data: tour.itinerary.map((step, index) => ({
        tourId,
        title: step.title,
        description: step.text,
        timeLabel: step.time ?? null,
        sortOrder: index,
      })),
    })

    // FAQs: carry no foreign keys, so they are replaced.
    await prisma.faq.deleteMany({ where: { tourId } })
    await prisma.faq.createMany({
      data: (FAQS[tour.slug] ?? []).map(([question, answer], index) => ({
        scope: 'TOUR',
        tourId,
        question,
        answer,
        sortOrder: index,
        isPublished: true,
      })),
    })

    // No pickup points: hotel pickup is sold as an add-on.
    await prisma.tourPickupLocation.updateMany({ where: { tourId }, data: { isActive: false } })

    // Photos
    const mediaIds = await importPhotos(tour)
    await prisma.tourImage.deleteMany({ where: { tourId } })
    await prisma.tourImage.createMany({
      data: mediaIds.map((mediaId, index) => ({ tourId, mediaId, isCover: index === 0, sortOrder: index })),
    })
    console.log(`  ${tour.options.length} opción(es), ${tour.extras.length} opcional(es), ${mediaIds.length} fotos · ${hash(tour.description)}`)
  }

  // Placeholders that are not part of the business's catalogue.
  const archived = await prisma.tour.updateMany({
    where: { slug: { notIn: [...catalogueSlugs] }, status: 'PUBLISHED' },
    data: { status: 'ARCHIVED', archivedAt: new Date(), featured: false },
  })
  console.log(`\nArchived ${archived.count} placeholder tours.`)

  // Categories with nothing left in them.
  for (const category of await prisma.tourCategory.findMany({
    select: { id: true, slug: true, _count: { select: { tours: { where: { status: 'PUBLISHED' } } } } },
  })) {
    if (category._count.tours === 0) {
      await prisma.tourCategory.update({ where: { id: category.id }, data: { status: 'ARCHIVED' } })
      console.log(`Archived empty category ${category.slug}`)
    }
  }

  // Redirect map for renamed slugs, consumed by next.config.
  const redirects = TOURS.flatMap((t) => (t.previousSlugs ?? []).map((from) => ({ from, to: t.slug })))
  console.log('\nRedirects:', JSON.stringify(redirects))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
