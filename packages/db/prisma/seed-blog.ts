/**
 * Demo editorial content, written around real search intent (section 32).
 *
 * These are substantive guides, not thin SEO pages: each answers a question a
 * traveller actually asks and links to related content. All rows are marked
 * `isDemo: true` so they are easy to find and replace.
 *
 * Factual claims are limited to publicly verifiable information about El
 * Calafate. Nothing about the operator's own history or credentials is
 * asserted, because that is not ours to invent.
 */

export type SeedPost = {
  slug: string
  title: string
  excerpt: string
  categorySlug: string
  destinationSlug?: string
  tags: string[]
  featured: boolean
  content: string
  faqs?: { question: string; answer: string }[]
}

export const BLOG_POSTS: SeedPost[] = [
  {
    slug: 'que-hacer-en-el-calafate',
    title: 'Qué hacer en El Calafate: guía completa de actividades',
    excerpt:
      'Las excursiones, caminatas y visitas que vale la pena hacer en El Calafate, organizadas por tipo de viaje y días disponibles.',
    categorySlug: 'el-calafate',
    destinationSlug: 'el-calafate',
    tags: ['el-calafate', 'itinerarios', 'primera-vez'],
    featured: true,
    content: `El Calafate concentra la oferta de servicios turísticos del sur de Santa Cruz y funciona como base para visitar el Parque Nacional Los Glaciares. La mayoría de las actividades salen de la ciudad y vuelven el mismo día.

Esta guía ordena las opciones por tipo, para que puedas armar un itinerario según los días que tengas.

## El Glaciar Perito Moreno

Es la visita central y la razón por la que la mayoría llega a El Calafate. El glaciar está a unos 80 kilómetros por la Ruta Provincial 11, dentro del Parque Nacional Los Glaciares.

Hay tres formas de verlo, y no son excluyentes:

**Las pasarelas.** El circuito peatonal de la Península de Magallanes ofrece varios senderos con miradores a distintas alturas frente al frente del glaciar. Es la forma más accesible y la que permite más tiempo de contemplación. Requiere medio día o una jornada completa.

**Desde el agua.** El Safari Náutico es una navegación de aproximadamente una hora por el Canal de los Témpanos, frente a la pared sur. Cambia por completo la percepción de la escala.

**Sobre el hielo.** El minitrekking implica una caminata con crampones sobre la superficie del glaciar, guiada por prestadores habilitados. Tiene restricciones de edad y requiere condición física.

## Las navegaciones por el Lago Argentino

Los glaciares Upsala y Spegazzini no tienen acceso terrestre: solo se llegan por vía lacustre. La navegación Todo Glaciares parte de Puerto Punta Bandera y recorre el Brazo Norte del Lago Argentino, entre témpanos.

Es una jornada completa y una alternativa distinta al Perito Moreno, no un reemplazo.

## Actividades en la ciudad y alrededores

Si llegás por la tarde o tenés un día de transición, hay opciones cortas:

- **Reserva Natural Laguna Nimez**, a pocas cuadras del centro, con senderos para observación de aves.
- **Glaciarium**, centro de interpretación sobre glaciología, útil como contexto antes de ver el glaciar.
- **Balcones de El Calafate**, miradores en los cerros que rodean la ciudad, a los que se accede en 4x4.

## Excursiones de día completo

- **El Chaltén**, a 215 kilómetros, para ver el Cerro Fitz Roy y caminar alguno de los senderos cortos del sector norte del parque.
- **Día de campo en una estancia**, con demostración de esquila y asado de cordero patagónico.
- **Cerro Frías**, que combina 4x4 y trekking, con panorámicas del Lago Argentino y el Lago Viedma.

## Cómo ordenar el itinerario

Con **dos días**, la prioridad es el Perito Moreno el primer día completo y una actividad corta el segundo.

Con **tres días**, entra una navegación o el minitrekking.

Con **cuatro o más**, se justifica el día completo a El Chaltén o quedarse a dormir allí si querés hacer los trekkings largos.

Ver también: [Cuántos días estar en El Calafate](/blog/cuantos-dias-en-el-calafate) y [Cómo visitar el Glaciar Perito Moreno](/blog/como-visitar-el-glaciar-perito-moreno).`,
    faqs: [
      {
        question: '¿Cuál es la actividad imprescindible en El Calafate?',
        answer:
          'La visita al Glaciar Perito Moreno, en el Parque Nacional Los Glaciares. Es la razón principal por la que la mayoría de los visitantes llega a la ciudad.',
      },
      {
        question: '¿Se puede visitar El Calafate sin contratar excursiones?',
        answer:
          'Parcialmente. La Reserva Laguna Nimez y el centro se recorren a pie, pero llegar al Parque Nacional requiere vehículo propio, transporte regular o una excursión contratada.',
      },
    ],
  },
  {
    slug: 'como-visitar-el-glaciar-perito-moreno',
    title: 'Cómo visitar el Glaciar Perito Moreno: todas las opciones',
    excerpt:
      'Cómo llegar, cuánto cuesta la entrada al parque, cuánto tiempo dedicarle y qué diferencia hay entre pasarelas, navegación y minitrekking.',
    categorySlug: 'perito-moreno',
    destinationSlug: 'glaciar-perito-moreno',
    tags: ['perito-moreno', 'primera-vez', 'presupuesto'],
    featured: true,
    content: `El Glaciar Perito Moreno está en el Parque Nacional Los Glaciares, a unos 80 kilómetros de El Calafate por la Ruta Provincial 11. El trayecto lleva alrededor de una hora y media.

## Cómo llegar

**Con excursión contratada.** Es la opción más común. Incluye el traslado ida y vuelta, guía acompañante y tiempo libre en las pasarelas. La entrada al parque se abona aparte, en el acceso.

**En vehículo propio o alquilado.** El camino está asfaltado en su totalidad y no presenta dificultad. Permite manejar los tiempos con libertad. Hay estacionamiento en el área de pasarelas.

**En transporte regular.** Existen servicios de bus que van y vuelven en el día, sin guía. Es la alternativa más económica.

## La entrada al parque

La entrada al Parque Nacional Los Glaciares **no está incluida** en ninguna excursión y se abona en el acceso.

La tarifa la fija la Administración de Parques Nacionales y varía según residencia: hay valores diferenciados para residentes de Santa Cruz, residentes argentinos, residentes del Mercosur y extranjeros no residentes. También cambia según la temporada.

Consultá el valor vigente antes de viajar, en el sitio oficial de Parques Nacionales.

## Las tres formas de verlo

### Las pasarelas

El circuito peatonal recorre la Península de Magallanes, enfrente del glaciar. Hay varios senderos de distinta extensión, conectados por escaleras y rampas, con miradores a diferentes alturas.

Existe un sector accesible para personas con movilidad reducida.

Dedicarle entre tres y cuatro horas permite recorrer los circuitos principales sin apuro y esperar algún desprendimiento de hielo.

### El Safari Náutico

Navegación de aproximadamente una hora por el Canal de los Témpanos, frente a la pared sur. Parte del Puerto Bajo de las Sombras, dentro del parque.

No incluye el traslado desde El Calafate: se contrata como complemento de la visita a las pasarelas o se llega por medios propios.

### El minitrekking

Caminata con crampones sobre la superficie del glaciar, de aproximadamente una hora y media, a cargo de guías de montaña habilitados.

Incluye una navegación corta por el Brazo Rico hasta la costa del glaciar.

Tiene **restricciones de edad** —en general de 10 a 65 años para el minitrekking clásico— y requiere calzado de trekking cerrado con caña alta. No se admite calzado deportivo liviano.

La variante Big Ice es más extensa y exigente, con un rango de edad más acotado.

## Cuándo ir

El glaciar se visita todo el año. En verano los días son largos y hay más desprendimientos, porque el calor acelera el proceso. En invierno hay menos visitantes y el paisaje aparece nevado, aunque algunos servicios reducen frecuencia.

Dentro del día, la luz de la mañana ilumina mejor el frente norte y la de la tarde el frente sur.

## Las rupturas

Periódicamente el avance del glaciar bloquea el Brazo Rico y forma un dique de hielo que termina colapsando.

El fenómeno **no tiene periodicidad fija** y no puede anticiparse con precisión. No conviene planificar un viaje en función de presenciarlo.

Ver también: [Qué hacer en El Calafate](/blog/que-hacer-en-el-calafate) y [Qué ropa llevar a El Calafate](/blog/que-ropa-llevar-a-el-calafate).`,
    faqs: [
      {
        question: '¿La entrada al Parque Nacional está incluida en las excursiones?',
        answer:
          'No. Se abona en el acceso al parque y su valor lo fija la Administración de Parques Nacionales, con tarifas diferenciadas según residencia y temporada.',
      },
      {
        question: '¿Cuánto tiempo conviene dedicarle al glaciar?',
        answer:
          'Entre tres y cuatro horas en el área de pasarelas permiten recorrer los circuitos principales sin apuro. Si sumás navegación o minitrekking, es una jornada completa.',
      },
      {
        question: '¿Se puede ver el glaciar en invierno?',
        answer:
          'Sí. El parque abre todo el año. En invierno hay menos visitantes y el entorno suele estar nevado, aunque algunos servicios reducen su frecuencia.',
      },
    ],
  },
  {
    slug: 'cuantos-dias-en-el-calafate',
    title: 'Cuántos días estar en El Calafate',
    excerpt:
      'Cuántas noches reservar según lo que quieras hacer, con itinerarios sugeridos de dos, tres, cuatro y cinco días.',
    categorySlug: 'consejos-de-viaje',
    destinationSlug: 'el-calafate',
    tags: ['itinerarios', 'primera-vez', 'el-calafate'],
    featured: true,
    content: `La respuesta corta: **tres noches** es lo mínimo razonable para conocer El Calafate sin correr. Con dos se ve el glaciar y poco más; con cuatro o cinco entra El Chaltén.

## Dos noches: solo el glaciar

Sirve si El Calafate es una escala dentro de un recorrido más largo.

- **Día 1:** llegada, city tour o Laguna Nimez por la tarde.
- **Día 2:** día completo al Glaciar Perito Moreno.
- **Día 3:** salida.

El riesgo de este esquema es que no deja margen: si el día del glaciar el clima es malo, no hay reemplazo.

## Tres noches: el esquema recomendado

- **Día 1:** llegada y actividad corta (Glaciarium o Laguna Nimez).
- **Día 2:** Glaciar Perito Moreno, pasarelas y navegación.
- **Día 3:** navegación Todo Glaciares, minitrekking o Balcones en 4x4.
- **Día 4:** salida.

Deja un día de reserva ante mal clima y permite elegir entre varias actividades.

## Cuatro noches: sumar El Chaltén

- **Día 1:** llegada y actividad corta.
- **Día 2:** Glaciar Perito Moreno.
- **Día 3:** El Chaltén en el día.
- **Día 4:** navegación o estancia.
- **Día 5:** salida.

El día a El Chaltén es largo —salida temprano, regreso de noche— pero alcanza para los senderos cortos del pueblo.

## Cinco noches o más: dormir en El Chaltén

Si querés hacer los trekkings largos del sector norte del parque, como Laguna de los Tres, conviene trasladar el alojamiento.

Ese trekking requiere entre ocho y diez horas y no es compatible con el horario de regreso de una excursión de día.

Un esquema posible: tres noches en El Calafate y dos en El Chaltén.

## Sobre el clima

El clima patagónico es variable y puede afectar navegaciones, actividades sobre hielo y visibilidad de los cerros.

Presupuestar un día extra no es conservadurismo: es lo que permite reprogramar sin perder la actividad.

Ver también: [Mejor época para visitar El Calafate](/blog/mejor-epoca-para-visitar-el-calafate).`,
    faqs: [
      {
        question: '¿Alcanza con dos días en El Calafate?',
        answer:
          'Alcanza para ver el Glaciar Perito Moreno, pero no deja margen ante mal clima ni tiempo para navegaciones o El Chaltén. Tres noches es lo mínimo recomendable.',
      },
      {
        question: '¿Conviene dormir en El Chaltén?',
        answer:
          'Sí, si tu objetivo son los trekkings largos como Laguna de los Tres, que requieren entre 8 y 10 horas. Para una visita panorámica, la excursión de día desde El Calafate es suficiente.',
      },
    ],
  },
  {
    slug: 'mejor-epoca-para-visitar-el-calafate',
    title: 'Mejor época para visitar El Calafate',
    excerpt:
      'Cómo es cada estación en El Calafate, qué actividades operan en cada una y cuándo conviene viajar según lo que busques.',
    categorySlug: 'consejos-de-viaje',
    destinationSlug: 'el-calafate',
    tags: ['clima', 'primera-vez', 'el-calafate'],
    featured: false,
    content: `El Calafate se visita todo el año, pero la experiencia cambia bastante según la estación. No hay una "mejor época" universal: depende de qué priorices.

## Verano: diciembre a febrero

Es la temporada alta. Los días son largos —en diciembre hay luz hasta cerca de las 22— y las temperaturas máximas rondan valores templados, aunque el viento puede ser intenso.

**A favor:** todas las actividades operan con frecuencia máxima; los desprendimientos de hielo son más frecuentes por el calor; los senderos de El Chaltén están en mejores condiciones.

**En contra:** más visitantes en las pasarelas y en los senderos; alojamiento y servicios con mayor demanda, por lo que conviene reservar con anticipación.

## Otoño: marzo a mayo

Marzo conserva buena parte de las condiciones del verano con menos gente. En abril y mayo bajan las temperaturas y se acortan los días.

**A favor:** los bosques de lenga y ñire toman color; menos afluencia; mejor disponibilidad.

**En contra:** hacia mayo algunos servicios reducen frecuencia.

## Invierno: junio a agosto

Temporada baja. Días cortos, temperaturas bajo cero frecuentes y posibilidad de nieve.

**A favor:** el glaciar y el entorno nevados; muy pocos visitantes; precios generalmente más bajos.

**En contra:** varias actividades reducen frecuencia o no operan; los días cortos limitan el tiempo útil; las rutas pueden verse afectadas.

## Primavera: septiembre a noviembre

La transición. Noviembre ya se comporta como temporada alta.

**A favor:** buen equilibrio entre condiciones y afluencia; la estepa florece.

**En contra:** el viento suele ser más intenso en primavera; el clima es especialmente variable.

## El viento

Es una constante del año, no una particularidad estacional. Puede afectar navegaciones y salidas en kayak, que se suspenden por razones de seguridad cuando las condiciones lo requieren.

Es la principal razón para no dejar las actividades acuáticas para el último día del viaje.

Ver también: [Qué ropa llevar a El Calafate](/blog/que-ropa-llevar-a-el-calafate).`,
    faqs: [
      {
        question: '¿Cuál es la temporada alta en El Calafate?',
        answer:
          'De noviembre a marzo, con el pico entre diciembre y febrero. En ese período conviene reservar alojamiento y excursiones con anticipación.',
      },
      {
        question: '¿Vale la pena ir en invierno?',
        answer:
          'Si buscás el paisaje nevado y pocos visitantes, sí. Hay que contar con días cortos y con que algunas actividades reducen frecuencia o no operan.',
      },
    ],
  },
  {
    slug: 'como-llegar-a-el-calafate',
    title: 'Cómo llegar a El Calafate y cómo ir del aeropuerto al centro',
    excerpt:
      'Las opciones para llegar a El Calafate por aire y por tierra, y cómo cubrir los 23 kilómetros entre el aeropuerto y la ciudad.',
    categorySlug: 'traslados',
    destinationSlug: 'el-calafate',
    tags: ['transporte', 'primera-vez', 'el-calafate'],
    featured: false,
    content: `El Calafate está en el sudoeste de la provincia de Santa Cruz. Las distancias en la Patagonia son grandes, así que la vía de acceso condiciona bastante la planificación.

## En avión

El **Aeropuerto Internacional Comandante Armando Tola (FTE)** está a unos 23 kilómetros del centro.

Opera vuelos regulares desde Buenos Aires —tanto Aeroparque como Ezeiza, según la aerolínea y la temporada— y conexiones estacionales con Bariloche, Ushuaia, Córdoba y Trelew.

La frecuencia aumenta en temporada alta y se reduce en invierno.

Es la vía más práctica: el vuelo desde Buenos Aires demora alrededor de tres horas, frente a más de treinta por tierra.

## En micro

El Calafate está conectado por servicios de larga distancia con Río Gallegos, El Chaltén, Puerto Natales (Chile) y otros destinos patagónicos.

La terminal de ómnibus está en el centro de la ciudad.

Desde Buenos Aires el viaje supera las treinta horas, por lo que la combinación habitual es volar a Río Gallegos o El Calafate.

## En auto

La Ruta Nacional 40 y la Ruta Provincial 11 conectan El Calafate con el resto de la región. Los tramos principales están asfaltados.

Alquilar un auto tiene sentido si planeás moverte con libertad entre El Calafate, El Chaltén y el parque. Conviene verificar las condiciones de las rutas en invierno.

## Del aeropuerto al centro

Son unos 23 kilómetros y el trayecto lleva entre 30 y 40 minutos.

**Traslado compartido.** Servicio regular que coincide con los arribos y deja a cada pasajero en su alojamiento. Es la opción más económica con servicio puerta a puerta.

**Traslado privado.** Vehículo exclusivo, directo. Conviene para grupos, familias o llegadas nocturnas.

**Taxi o remís.** Disponibles en la terminal.

**Auto de alquiler.** Las agencias operan en el aeropuerto.

En todos los casos, si contratás el traslado con anticipación conviene informar el **número de vuelo**: permite hacer seguimiento y ajustar el servicio si hay demoras.

## Hacia El Chaltén

El Chaltén está a 215 kilómetros, unas tres horas por las rutas 40 y 23. Hay servicios regulares de micro y traslados contratados, en ambos sentidos.

Ver también: [Cuántos días estar en El Calafate](/blog/cuantos-dias-en-el-calafate).`,
    faqs: [
      {
        question: '¿A qué distancia está el aeropuerto de El Calafate?',
        answer:
          'El Aeropuerto Internacional Comandante Armando Tola está a unos 23 kilómetros del centro. El trayecto lleva entre 30 y 40 minutos.',
      },
      {
        question: '¿Cuánto se tarda de El Calafate a El Chaltén?',
        answer:
          'Aproximadamente tres horas para cubrir los 215 kilómetros por las rutas 40 y 23.',
      },
    ],
  },
  {
    slug: 'que-ropa-llevar-a-el-calafate',
    title: 'Qué ropa llevar a El Calafate',
    excerpt:
      'Qué poner en la valija para la Patagonia, por qué el sistema de capas funciona mejor que un abrigo grueso y qué exige cada actividad.',
    categorySlug: 'consejos-de-viaje',
    destinationSlug: 'el-calafate',
    tags: ['clima', 'primera-vez', 'presupuesto'],
    featured: false,
    content: `El clima en El Calafate cambia varias veces en un mismo día, y el viento es un factor constante. La sensación térmica suele ser bastante más baja que la temperatura registrada.

La regla práctica: **capas**, no un abrigo grueso.

## El sistema de tres capas

**Primera capa (contra la piel).** Ropa térmica que transporte la humedad hacia afuera. Evitá el algodón: retiene la transpiración y enfría.

**Segunda capa (aislación).** Polar o pluma liviana. Es la capa que se agrega o se quita según la exposición.

**Tercera capa (protección).** Campera rompeviento e impermeable. En la Patagonia es la más importante de las tres: el viento es lo que realmente enfría.

## Para cualquier actividad

- Calzado cerrado con suela de buen agarre
- Gorro o buff que cubra las orejas
- Guantes
- Anteojos de sol
- Protector solar de factor alto
- Mochila pequeña para llevar capas y agua

El protector solar no es opcional ni siquiera en invierno: la reflexión sobre el hielo y la nieve aumenta la exposición.

## Según la actividad

**Pasarelas del Perito Moreno.** Calzado cómodo, las tres capas y guantes. Hay escaleras y sectores expuestos al viento.

**Minitrekking o Big Ice.** **Calzado de trekking cerrado, con caña alta y buen agarre** — es obligatorio y no se admite calzado deportivo liviano, porque los crampones se ajustan sobre él. Sumá guantes impermeables.

**Navegaciones.** La cubierta exterior es el mejor punto de observación y también el más expuesto. Campera cortaviento imprescindible.

**Kayak.** El traje seco lo provee el prestador, pero se usa sobre ropa térmica propia. Llevá una muda completa de recambio.

**El Chaltén.** Si vas a caminar, calzado de trekking y las tres capas. El clima en el sector norte del parque es aún más variable.

## Qué no hace falta

No necesitás ropa de expedición ni botas de alta montaña para las actividades habituales. Un equipo de trekking estándar en buen estado alcanza.

Ver también: [Mejor época para visitar El Calafate](/blog/mejor-epoca-para-visitar-el-calafate).`,
    faqs: [
      {
        question: '¿Qué calzado necesito para el minitrekking?',
        answer:
          'Calzado de trekking cerrado, con caña alta y suela de buen agarre. Es obligatorio: los crampones se ajustan sobre ese calzado y no se adaptan a zapatillas deportivas livianas.',
      },
      {
        question: '¿Hace falta ropa de expedición?',
        answer:
          'No. Para las actividades habituales alcanza con un equipo de trekking estándar en buen estado, organizado en tres capas.',
      },
    ],
  },
  {
    slug: 'el-calafate-en-3-dias',
    title: 'Qué hacer en El Calafate en 3 días: itinerario día por día',
    excerpt:
      'Un itinerario concreto de tres días en El Calafate, con alternativas para días de mal clima.',
    categorySlug: 'el-calafate',
    destinationSlug: 'el-calafate',
    tags: ['itinerarios', 'el-calafate', 'primera-vez'],
    featured: false,
    content: `Tres días completos es el esquema que mejor equilibra tiempo y costo en El Calafate: alcanza para el glaciar, una segunda actividad importante y un margen ante mal clima.

Este itinerario asume que llegás el día anterior o muy temprano el primer día.

## Día 1 — Aclimatación y ciudad

Si llegás por la mañana, el día da para una actividad corta. Si llegás por la tarde, alcanza para recorrer el centro.

**Opción A — Glaciarium.** El centro de interpretación explica cómo se forman los glaciares y cómo funciona el Campo de Hielo Patagónico Sur. Verlo *antes* del Perito Moreno hace que al día siguiente entiendas lo que estás mirando.

**Opción B — Reserva Laguna Nimez.** A pocas cuadras del centro, con senderos para observación de aves. Una o dos horas.

Por la tarde, la avenida Libertador concentra comercios y restaurantes.

## Día 2 — Glaciar Perito Moreno

El día central. Conviene dedicarle la jornada completa.

Salida temprano hacia el Parque Nacional, a 80 kilómetros por la Ruta 11. Ingreso al parque —recordá que la entrada se abona ahí y no está incluida en las excursiones— y llegada al área de pasarelas.

Dedicá **tres o cuatro horas** a los circuitos peatonales. Hay senderos a distintas alturas y cada uno ofrece un ángulo diferente del frente.

Si podés, sumá el **Safari Náutico**: una hora de navegación por el Canal de los Témpanos que cambia la percepción de la escala del frente.

Regreso a media tarde.

## Día 3 — La segunda gran actividad

Acá se elige según el tipo de viaje:

**Si querés caminar sobre el hielo:** minitrekking en el Perito Moreno. Jornada completa, con restricción de edad y requisito de calzado de trekking.

**Si preferís los glaciares sin acceso terrestre:** navegación Todo Glaciares por el Brazo Norte, hasta el Upsala y el Spegazzini.

**Si viajás en familia o querés algo más tranquilo:** día de campo en una estancia, con esquila y asado de cordero.

**Si tenés medio día:** Balcones de El Calafate en 4x4 o el Cerro Frías.

## Si un día el clima no acompaña

El viento puede suspender navegaciones y kayak. Las alternativas bajo techo o menos expuestas:

- Glaciarium
- Día de campo en estancia
- Las pasarelas del Perito Moreno, que operan salvo cierre del parque

Tener el día 3 flexible es lo que permite reacomodar sin perder nada.

Ver también: [Cuántos días estar en El Calafate](/blog/cuantos-dias-en-el-calafate) y [Qué hacer en El Calafate](/blog/que-hacer-en-el-calafate).`,
    faqs: [
      {
        question: '¿Qué día conviene reservar el Perito Moreno?',
        answer:
          'El segundo día del itinerario, dejando el tercero flexible. Así, si el clima complica una actividad, queda margen para reprogramar.',
      },
    ],
  },
]

/** Global FAQs shown on /preguntas-frecuentes and used for FAQPage schema. */
export const GLOBAL_FAQS = [
  {
    question: '¿Cómo reservo una excursión?',
    answer:
      'Elegí la excursión, la fecha y la opción que prefieras, completá tus datos y realizá el pago online. Vas a recibir un correo con la referencia de tu reserva. La reserva queda confirmada una vez acreditado el pago.',
  },
  {
    question: '¿Qué medios de pago se aceptan?',
    answer:
      'Los medios de pago disponibles se muestran al momento del checkout. El pago se procesa a través de plataformas de pago seguras: los datos de tu tarjeta no se almacenan en nuestros servidores.',
  },
  {
    question: '¿La entrada al Parque Nacional está incluida?',
    answer:
      'No. La entrada al Parque Nacional Los Glaciares se abona en el acceso al parque. La tarifa la fija la Administración de Parques Nacionales y varía según residencia y temporada.',
  },
  {
    question: '¿Puedo cancelar una reserva?',
    answer:
      'Sí, según la política de cancelación de cada excursión, que se indica en la ficha del producto y en el correo de confirmación. En general hay cancelación sin cargo hasta 24 horas antes de la salida.',
  },
  {
    question: '¿Qué pasa si una excursión se suspende por el clima?',
    answer:
      'Si la excursión se suspende por condiciones meteorológicas o por decisión de la autoridad del parque, ofrecemos reprogramación sin cargo o el reintegro total del importe abonado.',
  },
  {
    question: '¿Las excursiones incluyen traslado desde el hotel?',
    answer:
      'La mayoría sí. Cada ficha indica si el traslado está incluido y cuáles son los puntos de encuentro disponibles. Al reservar, indicá el nombre de tu alojamiento.',
  },
  {
    question: '¿Hay excursiones en inglés?',
    answer:
      'Las excursiones regulares cuentan con guías bilingües en español e inglés. Para otros idiomas, consultanos antes de reservar.',
  },
  {
    question: '¿Cómo contacto si tengo un problema con mi reserva?',
    answer:
      'Respondé al correo de confirmación indicando la referencia de tu reserva, o escribinos por los canales de contacto publicados en el sitio.',
  },
]
