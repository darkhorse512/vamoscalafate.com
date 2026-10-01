/**
 * Seasonal guidance for El Calafate.
 *
 * Ranges are approximate and deliberately rounded: Patagonian weather varies
 * a great deal year to year, and precise-looking figures would promise a
 * certainty the climate does not offer. Daylight follows from latitude
 * (~50°S), so those values are the steadiest here.
 */
export const SEASONS = [
  {
    id: 'verano',
    name: 'Verano',
    months: 'Dic – Feb',
    daylight: 'hasta ~17 h',
    temperature: '5 a 20 °C',
    imageSlug: 'glaciar-perito-moreno',
    description:
      'La temporada alta. Los días larguísimos permiten combinar glaciar y navegación en una misma jornada, y todos los servicios funcionan a pleno. Es también la época de más viento y de mayor demanda: conviene reservar con anticipación.',
    goodFor: ['Navegaciones', 'Minitrekking', 'Trekking en El Chaltén', 'Días largos'],
  },
  {
    id: 'otono',
    name: 'Otoño',
    months: 'Mar – May',
    daylight: '10 a 13 h',
    temperature: '0 a 14 °C',
    imageSlug: 'parque-nacional-los-glaciares',
    description:
      'Los bosques de lenga se tiñen de rojo y naranja, el viento suele calmarse y hay menos visitantes. Para muchos, la época más fotogénica del año.',
    goodFor: ['Fotografía', 'Bosques de lenga', 'Menos gente', 'Pasarelas'],
  },
  {
    id: 'invierno',
    name: 'Invierno',
    months: 'Jun – Ago',
    daylight: '~8 h',
    temperature: '-5 a 5 °C',
    imageSlug: 'el-chalten',
    description:
      'Paisajes nevados y silencio. El Glaciar Perito Moreno se visita todo el año desde las pasarelas, aunque algunas excursiones reducen su frecuencia o hacen pausa. Ideal para un viaje tranquilo.',
    goodFor: ['Paisajes nevados', 'Pasarelas', 'Viaje tranquilo', 'Glaciarium'],
  },
  {
    id: 'primavera',
    name: 'Primavera',
    months: 'Sep – Nov',
    daylight: '12 a 16 h',
    temperature: '2 a 15 °C',
    imageSlug: 'lago-argentino',
    description:
      'Los días se alargan, la estepa florece y regresan las aves a la Laguna Nimez. Las excursiones retoman su ritmo completo antes de la temporada alta.',
    goodFor: ['Avistaje de aves', 'Estepa en flor', 'Cabalgatas', 'Temporada media'],
  },
] as const
