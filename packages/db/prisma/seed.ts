/**
 * Database seed.
 *
 *   pnpm db:seed
 *
 * Idempotent: every write is an upsert keyed on a natural unique column, so
 * re-running updates rather than duplicating. Safe to run against an existing
 * database, though it will overwrite demo rows.
 *
 * What it creates:
 *   · The RBAC Role / Permission tables, mirrored from packages/shared/rbac.ts
 *   · One SUPER_ADMIN, from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 *   · Destinations, attractions, tour & business categories, hotel amenities
 *   · 15 demo tourism products with options, itinerary, pickups and FAQs
 *   · Demo blog posts, global FAQs, legal pages and site settings
 *   · Two demo hotels and two demo businesses
 *
 * What it deliberately does NOT create: reviews, ratings, bookings, customers
 * or payments. Fabricated social proof would mislead travellers, and fake
 * bookings would corrupt the reporting the dashboard is meant to provide.
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client/client.ts'
import {
  BLOG_CATEGORIES,
  BLOG_TAGS,
  BUSINESS_CATEGORIES,
  DEMO_NOTICE,
  DESTINATIONS,
  HOTEL_AMENITIES,
  TOUR_CATEGORIES,
  TOURS,
} from './seed-data.ts'
import { BLOG_POSTS, GLOBAL_FAQS } from './seed-blog.ts'
import { LEGAL_PAGES } from './seed-legal.ts'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const toCents = (amount: number) => Math.round(amount * 100)

function readingTime(content: string): number {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200))
}

// ── RBAC ────────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'BOOKING_MANAGER', 'CONTENT_MANAGER'] as const

const RESOURCES = [
  'dashboard', 'tours', 'categories', 'bookings', 'customers', 'payments', 'hotels',
  'businesses', 'submissions', 'blog', 'reviews', 'destinations', 'attractions',
  'media', 'seo', 'settings', 'users', 'audit',
] as const

const ACTIONS = ['read', 'create', 'update', 'delete', 'publish', 'refund'] as const

const ROLE_META: Record<string, { name: string; description: string }> = {
  SUPER_ADMIN: { name: 'Super administrador', description: 'Acceso total, incluida la gestión de usuarios y la configuración del sitio.' },
  ADMIN: { name: 'Administrador', description: 'Gestiona todo el contenido y las operaciones, salvo usuarios y ajustes críticos.' },
  EDITOR: { name: 'Editor', description: 'Edita excursiones, destinos, blog y biblioteca de medios.' },
  BOOKING_MANAGER: { name: 'Gestor de reservas', description: 'Gestiona reservas, clientes y pagos.' },
  CONTENT_MANAGER: { name: 'Gestor de contenidos', description: 'Gestiona blog, destinos, hoteles, comercios y solicitudes de alta.' },
}

const ACTION_LABELS: Record<string, string> = {
  read: 'Ver', create: 'Crear', update: 'Editar',
  delete: 'Eliminar', publish: 'Publicar', refund: 'Reembolsar',
}

/**
 * Mirrors the code matrix into the database.
 *
 * Kept in sync by hand with packages/shared/src/rbac.ts rather than imported,
 * because the seed runs through Node's type stripping and must not pull in the
 * app's module graph. The tables are for display only - authorization decisions
 * always come from the code matrix.
 */
const ROLE_GRANTS: Record<string, string[]> = {
  SUPER_ADMIN: RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r}:${a}`)),
  ADMIN: [
    'dashboard:read',
    ...(['tours','categories','bookings','customers','payments','hotels','businesses','submissions','blog','reviews','destinations','attractions','media','seo'] as const)
      .flatMap((r) => ['read','create','update','delete','publish'].map((a) => `${r}:${a}`)),
    'payments:refund', 'settings:read', 'audit:read',
  ],
  EDITOR: [
    'dashboard:read',
    ...(['tours','categories','destinations','attractions','media','blog'] as const)
      .flatMap((r) => ['read','create','update'].map((a) => `${r}:${a}`)),
    'seo:read', 'seo:update', 'reviews:read',
  ],
  BOOKING_MANAGER: [
    'dashboard:read',
    ...(['bookings','customers'] as const).flatMap((r) => ['read','create','update'].map((a) => `${r}:${a}`)),
    'payments:read', 'payments:update', 'payments:refund',
    'tours:read', 'reviews:read', 'reviews:update',
  ],
  CONTENT_MANAGER: [
    'dashboard:read',
    ...(['blog','destinations','hotels','businesses','media'] as const)
      .flatMap((r) => ['read','create','update','publish'].map((a) => `${r}:${a}`)),
    'submissions:read', 'submissions:update',
    'reviews:read', 'reviews:update', 'seo:read', 'seo:update',
    'attractions:read', 'attractions:create', 'attractions:update',
  ],
}

async function seedRbac() {
  const permissionIds = new Map<string, string>()

  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const key = `${resource}:${action}`
      const permission = await prisma.permission.upsert({
        where: { key },
        create: { key, resource, action, description: `${ACTION_LABELS[action]} ${resource}` },
        update: { resource, action, description: `${ACTION_LABELS[action]} ${resource}` },
      })
      permissionIds.set(key, permission.id)
    }
  }

  for (const roleKey of ADMIN_ROLES) {
    const meta = ROLE_META[roleKey]!
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      create: { key: roleKey, name: meta.name, description: meta.description },
      update: { name: meta.name, description: meta.description },
    })

    // Replace grants wholesale so a narrowed matrix actually removes access.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    const grants = (ROLE_GRANTS[roleKey] ?? [])
      .map((key) => permissionIds.get(key))
      .filter((id): id is string => Boolean(id))

    await prisma.rolePermission.createMany({
      data: grants.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    })
  }

  console.log(`  ✓ RBAC: ${ADMIN_ROLES.length} roles, ${permissionIds.size} permissions`)
}

async function seedAdminUser() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@vamoscalafate.com').toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrador'

  if (!password) {
    const existing = await prisma.adminUser.findUnique({ where: { email } })
    if (existing) {
      console.log(`  · Admin user ${email} already exists - left unchanged`)
      return
    }
    console.log('')
    console.log('  ⚠  SEED_ADMIN_PASSWORD is not set - no admin user was created.')
    console.log('     Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env and re-run')
    console.log('     `pnpm db:seed` to create the first SUPER_ADMIN account.')
    console.log('')
    return
  }

  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters.')
  }

  // Cost 12: ~250 ms per hash on typical VPS hardware - slow enough to make
  // offline cracking expensive, fast enough for an interactive login.
  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.adminUser.upsert({
    where: { email },
    create: { email, name, passwordHash, role: 'SUPER_ADMIN', isActive: true },
    update: { name, passwordHash, role: 'SUPER_ADMIN', isActive: true },
  })

  console.log(`  ✓ SUPER_ADMIN: ${email}`)
  console.log('    Change this password after the first login.')
}

// ── Taxonomy ────────────────────────────────────────────────────────────────

async function seedDestinations() {
  const ids = new Map<string, string>()

  for (const [index, d] of DESTINATIONS.entries()) {
    const destination = await prisma.destination.upsert({
      where: { slug: d.slug },
      create: {
        slug: d.slug, name: d.name, shortIntro: d.shortIntro, description: d.description,
        region: d.region, latitude: d.latitude, longitude: d.longitude,
        featured: d.featured, sortOrder: index, status: 'PUBLISHED', publishedAt: new Date(),
      },
      update: {
        name: d.name, shortIntro: d.shortIntro, description: d.description,
        featured: d.featured, sortOrder: index, status: 'PUBLISHED',
      },
    })
    ids.set(d.slug, destination.id)

    for (const [i, a] of d.attractions.entries()) {
      await prisma.attraction.upsert({
        where: { slug: a.slug },
        create: {
          slug: a.slug, name: a.name, summary: a.summary, description: a.description,
          openingInfo: a.openingInfo, entryFeeInfo: a.entryFeeInfo,
          destinationId: destination.id, status: 'PUBLISHED', sortOrder: i,
        },
        update: {
          name: a.name, summary: a.summary, description: a.description,
          openingInfo: a.openingInfo, entryFeeInfo: a.entryFeeInfo, status: 'PUBLISHED',
        },
      })
    }
  }

  console.log(`  ✓ ${DESTINATIONS.length} destinations`)
  return ids
}

async function seedCategories() {
  const tourIds = new Map<string, string>()

  for (const c of TOUR_CATEGORIES) {
    const category = await prisma.tourCategory.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, channel: c.channel, sortOrder: c.sortOrder, status: 'PUBLISHED' },
      update: { name: c.name, description: c.description, channel: c.channel, sortOrder: c.sortOrder },
    })
    tourIds.set(c.slug, category.id)
  }

  const businessIds = new Map<string, string>()
  for (const c of BUSINESS_CATEGORIES) {
    const category = await prisma.businessCategory.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, channel: c.channel, icon: c.icon, sortOrder: c.sortOrder },
      update: { name: c.name, channel: c.channel, icon: c.icon, sortOrder: c.sortOrder },
    })
    businessIds.set(c.slug, category.id)
  }

  for (const a of HOTEL_AMENITIES) {
    await prisma.hotelAmenity.upsert({
      where: { key: a.key },
      create: { key: a.key, name: a.name, icon: a.icon },
      update: { name: a.name, icon: a.icon },
    })
  }

  console.log(`  ✓ ${TOUR_CATEGORIES.length} tour categories, ${BUSINESS_CATEGORIES.length} business categories, ${HOTEL_AMENITIES.length} amenities`)
  return { tourIds, businessIds }
}

// ── Tours ───────────────────────────────────────────────────────────────────

async function seedTours(categoryIds: Map<string, string>, destinationIds: Map<string, string>) {
  const tourIds = new Map<string, string>()

  for (const [index, t] of TOURS.entries()) {
    const categoryId = categoryIds.get(t.categorySlug)
    if (!categoryId) throw new Error(`Unknown tour category: ${t.categorySlug}`)

    const destinationId = t.destinationSlug ? (destinationIds.get(t.destinationSlug) ?? null) : null
    const fromPriceCents = Math.min(...t.options.map((o) => toCents(o.price)))

    const tour = await prisma.tour.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug, name: t.name, summary: t.summary, description: t.description,
        status: 'PUBLISHED', publishedAt: new Date(),
        categoryId, destinationId,
        fromPriceCents, currency: 'ARS',
        durationMinutes: t.durationMinutes, difficulty: t.difficulty, location: t.location,
        minAge: t.minAge ?? null, maxGroupSize: t.maxGroupSize ?? null,
        languages: ['Español', 'Inglés'],
        highlights: [...t.highlights], included: [...t.included], excluded: [...t.excluded],
        importantInfo: t.importantInfo, cancellationPolicy: t.cancellationPolicy,
        featured: t.featured, sortOrder: index, isDemo: true,
      },
      update: {
        name: t.name, summary: t.summary, description: t.description,
        status: 'PUBLISHED', categoryId, destinationId, fromPriceCents,
        durationMinutes: t.durationMinutes, difficulty: t.difficulty, location: t.location,
        minAge: t.minAge ?? null, maxGroupSize: t.maxGroupSize ?? null,
        highlights: [...t.highlights], included: [...t.included], excluded: [...t.excluded],
        importantInfo: t.importantInfo, cancellationPolicy: t.cancellationPolicy,
        featured: t.featured, sortOrder: index, isDemo: true,
      },
    })
    tourIds.set(t.slug, tour.id)

    // Child collections are replaced wholesale so re-seeding never duplicates.
    await prisma.tourOption.deleteMany({ where: { tourId: tour.id } })
    await prisma.tourItineraryStep.deleteMany({ where: { tourId: tour.id } })
    await prisma.tourPickupLocation.deleteMany({ where: { tourId: tour.id } })
    await prisma.faq.deleteMany({ where: { tourId: tour.id } })

    for (const [i, o] of t.options.entries()) {
      await prisma.tourOption.create({
        data: {
          tourId: tour.id, name: o.name, description: o.description,
          priceCents: toCents(o.price),
          childPriceCents: o.childPrice ? toCents(o.childPrice) : null,
          currency: 'ARS',
          durationMinutes: o.durationMinutes, capacity: o.capacity,
          minParticipants: o.minParticipants ?? 1, maxParticipants: o.maxParticipants,
          pickupIncluded: o.pickupIncluded, departureTimes: [...o.departureTimes],
          freeCancellationHours: o.freeCancellationHours,
          isActive: true, sortOrder: i,
        },
      })
    }

    for (const [i, s] of t.itinerary.entries()) {
      await prisma.tourItineraryStep.create({
        data: { tourId: tour.id, title: s.title, description: s.description, timeLabel: s.timeLabel ?? null, sortOrder: i },
      })
    }

    for (const [i, p] of t.pickupLocations.entries()) {
      await prisma.tourPickupLocation.create({
        data: {
          tourId: tour.id, name: p.name, offsetMinutes: p.offsetMinutes,
          extraCostCents: p.extraCost ? toCents(p.extraCost) : 0,
          isActive: true, sortOrder: i,
        },
      })
    }

    for (const [i, f] of t.faqs.entries()) {
      await prisma.faq.create({
        data: { scope: 'TOUR', tourId: tour.id, question: f.question, answer: f.answer, sortOrder: i, isPublished: true },
      })
    }
  }

  // Related tours need every tour to exist first.
  for (const t of TOURS) {
    const sourceId = tourIds.get(t.slug)
    if (!sourceId) continue
    await prisma.tourRelation.deleteMany({ where: { sourceId } })

    const targets = t.relatedSlugs
      .map((slug) => tourIds.get(slug))
      .filter((id): id is string => Boolean(id) && id !== sourceId)

    if (targets.length) {
      await prisma.tourRelation.createMany({
        data: targets.map((targetId, i) => ({ sourceId, targetId, sortOrder: i })),
        skipDuplicates: true,
      })
    }
  }

  console.log(`  ✓ ${TOURS.length} tours with options, itinerary, pickups and FAQs`)
  return tourIds
}

/**
 * Generates 120 days of forward inventory for every active option.
 *
 * Options with no `departureTimes` (private services and transfers) get a
 * single open slot per day with no fixed time, which is how those products
 * actually operate.
 */
async function seedAvailability() {
  const options = await prisma.tourOption.findMany({
    where: { isActive: true },
    select: { id: true, tourId: true, capacity: true, departureTimes: true },
  })

  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const DAYS = 120
  const rows: { tourId: string; optionId: string; date: Date; departureTime: string | null; seatsTotal: number }[] = []

  for (const option of options) {
    const times: (string | null)[] = option.departureTimes.length ? option.departureTimes : [null]
    for (let day = 0; day < DAYS; day += 1) {
      const date = new Date(start.getTime() + day * 86_400_000)
      for (const departureTime of times) {
        rows.push({ tourId: option.tourId, optionId: option.id, date, departureTime, seatsTotal: option.capacity })
      }
    }
  }

  await prisma.tourAvailability.deleteMany({ where: { date: { gte: start } } })

  // Chunked: a single createMany of ~30k rows risks exceeding parameter limits.
  const CHUNK = 2000
  for (let i = 0; i < rows.length; i += CHUNK) {
    await prisma.tourAvailability.createMany({ data: rows.slice(i, i + CHUNK), skipDuplicates: true })
  }

  console.log(`  ✓ ${rows.length} availability slots across ${DAYS} days`)
}

// ── Blog, FAQ, pages, settings ──────────────────────────────────────────────

async function seedBlog(destinationIds: Map<string, string>) {
  const categoryIds = new Map<string, string>()
  for (const [i, c] of BLOG_CATEGORIES.entries()) {
    const category = await prisma.blogCategory.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, description: c.description, sortOrder: i },
      update: { name: c.name, description: c.description, sortOrder: i },
    })
    categoryIds.set(c.slug, category.id)
  }

  const tagIds = new Map<string, string>()
  for (const slug of BLOG_TAGS) {
    const name = slug.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
    const tag = await prisma.blogTag.upsert({
      where: { slug }, create: { slug, name }, update: { name },
    })
    tagIds.set(slug, tag.id)
  }

  const author = await prisma.adminUser.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true } })

  for (const p of BLOG_POSTS) {
    const post = await prisma.blogPost.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content,
        status: 'PUBLISHED', publishedAt: new Date(),
        categoryId: categoryIds.get(p.categorySlug) ?? null,
        destinationId: p.destinationSlug ? (destinationIds.get(p.destinationSlug) ?? null) : null,
        authorId: author?.id ?? null,
        readingTime: readingTime(p.content), featured: p.featured, isDemo: true,
      },
      update: {
        title: p.title, excerpt: p.excerpt, content: p.content, status: 'PUBLISHED',
        categoryId: categoryIds.get(p.categorySlug) ?? null,
        readingTime: readingTime(p.content), featured: p.featured, isDemo: true,
      },
    })

    await prisma.blogPostTag.deleteMany({ where: { postId: post.id } })
    const tags = p.tags.map((t) => tagIds.get(t)).filter((id): id is string => Boolean(id))
    if (tags.length) {
      await prisma.blogPostTag.createMany({
        data: tags.map((tagId) => ({ postId: post.id, tagId })), skipDuplicates: true,
      })
    }

    await prisma.faq.deleteMany({ where: { blogPostId: post.id } })
    for (const [i, f] of (p.faqs ?? []).entries()) {
      await prisma.faq.create({
        data: { scope: 'BLOG', blogPostId: post.id, question: f.question, answer: f.answer, sortOrder: i },
      })
    }
  }

  console.log(`  ✓ ${BLOG_POSTS.length} blog posts, ${BLOG_CATEGORIES.length} categories, ${BLOG_TAGS.length} tags`)
}

async function seedGlobalFaqs() {
  await prisma.faq.deleteMany({ where: { scope: 'GLOBAL' } })
  for (const [i, f] of GLOBAL_FAQS.entries()) {
    await prisma.faq.create({
      data: { scope: 'GLOBAL', question: f.question, answer: f.answer, sortOrder: i, isPublished: true },
    })
  }
  console.log(`  ✓ ${GLOBAL_FAQS.length} global FAQs`)
}

async function seedLegalPages() {
  for (const page of LEGAL_PAGES) {
    await prisma.staticPage.upsert({
      where: { slug: page.slug },
      create: { slug: page.slug, title: page.title, content: page.content, status: 'PUBLISHED', publishedAt: new Date() },
      update: { title: page.title, content: page.content },
    })
  }
  console.log(`  ✓ ${LEGAL_PAGES.length} legal pages (editable from the admin)`)
}

async function seedSiteSettings() {
  const settings = [
    { key: 'site.tagline', group: 'general', label: 'Lema del sitio', value: 'Excursiones, traslados y experiencias en El Calafate' },
    { key: 'site.heroTitle', group: 'general', label: 'Título del hero', value: 'Viví la Patagonia desde El Calafate' },
    { key: 'site.heroSubtitle', group: 'general', label: 'Subtítulo del hero', value: 'Excursiones al Glaciar Perito Moreno, navegaciones por el Lago Argentino y traslados, con reserva online.' },
    { key: 'contact.address', group: 'contact', label: 'Dirección', value: 'El Calafate, Santa Cruz, Argentina' },
    { key: 'contact.hours', group: 'contact', label: 'Horario de atención', value: 'Lunes a sábado, 9 a 20 h (ART)' },
    { key: 'social.instagram', group: 'social', label: 'Instagram', value: '' },
    { key: 'social.facebook', group: 'social', label: 'Facebook', value: '' },
    { key: 'booking.minAdvanceHours', group: 'general', label: 'Antelación mínima de reserva (horas)', value: 24 },
    { key: 'seo.defaultTitleSuffix', group: 'seo', label: 'Sufijo de título SEO', value: 'Vamos Calafate' },
  ]

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      // Prisma's Json input accepts primitives as well as objects, so the
      // string and number values here need no cast.
      create: { key: s.key, value: s.value, group: s.group, label: s.label },
      // Values are intentionally NOT overwritten: an operator's edits must
      // survive a re-seed. Only the label and grouping are refreshed.
      update: { group: s.group, label: s.label },
    })
  }
  console.log(`  ✓ ${settings.length} site settings`)
}

// ── Demo directory listings ─────────────────────────────────────────────────

async function seedDirectory(destinationIds: Map<string, string>, businessCategoryIds: Map<string, string>) {
  const calafateId = destinationIds.get('el-calafate') ?? null

  const hotels = [
    {
      slug: 'hotel-demo-vista-lago',
      name: '[DEMO] Hotel Vista Lago',
      summary: 'Ficha de demostración. Reemplazá este contenido por un alojamiento real antes de publicar.',
      description: `${DEMO_NOTICE}\n\nEste registro existe para mostrar cómo se ve una ficha de alojamiento en la guía: galería, servicios, ubicación y datos de contacto. No corresponde a un establecimiento real.\n\nPara publicar un alojamiento verdadero, usá el formulario de alta en /hoteles/registrar o creá la ficha desde el panel de administración.`,
      starRating: 4,
      amenityKeys: ['wifi', 'desayuno', 'estacionamiento', 'calefaccion', 'vista-al-lago'],
    },
    {
      slug: 'hosteria-demo-del-glaciar',
      name: '[DEMO] Hostería del Glaciar',
      summary: 'Ficha de demostración. Reemplazá este contenido por un alojamiento real antes de publicar.',
      description: `${DEMO_NOTICE}\n\nSegundo registro de ejemplo, útil para verificar el listado y los filtros de la guía de alojamientos.`,
      starRating: 3,
      amenityKeys: ['wifi', 'desayuno', 'calefaccion', 'guarda-equipaje'],
    },
  ]

  for (const h of hotels) {
    const hotel = await prisma.hotel.upsert({
      where: { slug: h.slug },
      create: {
        slug: h.slug, name: h.name, summary: h.summary, description: h.description,
        starRating: h.starRating, status: 'PUBLISHED', publishedAt: new Date(),
        destinationId: calafateId, isDemo: true,
      },
      update: { name: h.name, summary: h.summary, description: h.description, isDemo: true },
    })

    await prisma.hotelAmenityOnHotel.deleteMany({ where: { hotelId: hotel.id } })
    const amenities = await prisma.hotelAmenity.findMany({ where: { key: { in: h.amenityKeys } }, select: { id: true } })
    await prisma.hotelAmenityOnHotel.createMany({
      data: amenities.map((a) => ({ hotelId: hotel.id, amenityId: a.id })), skipDuplicates: true,
    })
  }

  const businesses = [
    {
      slug: 'restaurante-demo-la-estepa',
      name: '[DEMO] Restaurante La Estepa',
      categorySlug: 'restaurantes',
      summary: 'Ficha de demostración. Reemplazá este contenido por un comercio real antes de publicar.',
      priceRange: '$$',
      services: ['Cordero patagónico', 'Menú vegetariano', 'Reservas'],
    },
    {
      slug: 'alquiler-demo-patagonia-rent',
      name: '[DEMO] Patagonia Rent a Car',
      categorySlug: 'alquiler-de-autos',
      summary: 'Ficha de demostración. Reemplazá este contenido por un comercio real antes de publicar.',
      priceRange: '$$$',
      services: ['Entrega en aeropuerto', 'Vehículos 4x4', 'Seguro incluido'],
    },
  ]

  for (const b of businesses) {
    const categoryId = businessCategoryIds.get(b.categorySlug)
    if (!categoryId) continue

    await prisma.business.upsert({
      where: { slug: b.slug },
      create: {
        slug: b.slug, name: b.name, summary: b.summary,
        description: `${DEMO_NOTICE}\n\nRegistro de ejemplo para verificar el listado y la ficha de comercios de la guía.`,
        categoryId, destinationId: calafateId, status: 'PUBLISHED', publishedAt: new Date(),
        priceRange: b.priceRange, services: b.services, isDemo: true,
      },
      update: { name: b.name, summary: b.summary, categoryId, priceRange: b.priceRange, services: b.services, isDemo: true },
    })
  }

  console.log(`  ✓ ${hotels.length} demo hotels, ${businesses.length} demo businesses`)
}

// ── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║  VAMOS CALAFATE - database seed                              ║')
  console.log('║  Demo content is marked isDemo=true and must be replaced     ║')
  console.log('║  with real commercial data before going live.                ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')

  await seedRbac()
  await seedAdminUser()
  const destinationIds = await seedDestinations()
  const { tourIds: categoryIds, businessIds } = await seedCategories()
  await seedTours(categoryIds, destinationIds)
  await seedAvailability()
  await seedBlog(destinationIds)
  await seedGlobalFaqs()
  await seedLegalPages()
  await seedSiteSettings()
  await seedDirectory(destinationIds, businessIds)

  console.log('')
  console.log('  Seed complete.')
  console.log('')
  console.log('  NOT seeded, by design: reviews, ratings, bookings, customers and')
  console.log('  payments. Fabricated social proof would mislead travellers and')
  console.log('  fake bookings would corrupt dashboard reporting.')
  console.log('')
}

main()
  .catch((error) => {
    console.error('\n  Seed failed:\n', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
