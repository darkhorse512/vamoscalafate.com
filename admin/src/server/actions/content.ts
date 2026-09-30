'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@vamos/db'
import {
  actionError, actionOk, logger, readingTimeMinutes, slugify,
  toPublicError, uniqueSlug, type ActionResult,
} from '@vamos/shared'
import {
  blogPostSchema, destinationSchema, hotelSchema, reviewModerationSchema,
  staticPageSchema, tourCategorySchema,
} from '@vamos/validation'
import { requirePermission } from '../auth'
import { recordAudit } from '../audit'
import { revalidateEntity } from '../revalidate'

const log = logger.scoped('admin:content')

/** Writes or updates the SEO row attached to a content entity. */
async function upsertSeo(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  existingSeoId: string | null,
  seo: {
    title?: string; description?: string; canonicalUrl?: string
    ogTitle?: string; ogDescription?: string; ogImageUrl?: string
    noindex: boolean; nofollow: boolean
  } | undefined,
): Promise<string | null> {
  if (!seo) return existingSeoId

  const data = {
    title: seo.title || null,
    description: seo.description || null,
    canonicalUrl: seo.canonicalUrl || null,
    ogTitle: seo.ogTitle || null,
    ogDescription: seo.ogDescription || null,
    ogImageUrl: seo.ogImageUrl || null,
    noindex: seo.noindex,
    nofollow: seo.nofollow,
  }

  if (existingSeoId) {
    await tx.seoMetadata.update({ where: { id: existingSeoId }, data })
    return existingSeoId
  }

  const created = await tx.seoMetadata.create({ data, select: { id: true } })
  return created.id
}

// ── Blog ────────────────────────────────────────────────────────────────────

export async function saveBlogPostAction(
  postId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission(postId ? 'blog:update' : 'blog:create')

    const parsed = blogPostSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos del artículo.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const existing = postId
      ? await prisma.blogPost.findUnique({
          where: { id: postId },
          select: { id: true, slug: true, title: true, status: true, publishedAt: true, seoId: true },
        })
      : null

    if (postId && !existing) return actionError('NOT_FOUND', 'El artículo no existe.')

    const slug =
      existing && slugify(data.slug) === existing.slug
        ? existing.slug
        : await uniqueSlug(data.slug || data.title, async (candidate) => {
            const clash = await prisma.blogPost.findFirst({
              where: { slug: candidate, ...(postId ? { id: { not: postId } } : {}) },
              select: { id: true },
            })
            return Boolean(clash)
          })

    /**
     * A future publishedAt schedules the post: the public queries filter on
     * `publishedAt <= now`, so it simply becomes visible when the time passes.
     */
    const publishedAt = data.publishedAt
      ? new Date(data.publishedAt)
      : data.status === 'PUBLISHED'
        ? (existing?.publishedAt ?? new Date())
        : existing?.publishedAt ?? null

    const result = await prisma.$transaction(async (tx) => {
      const seoId = await upsertSeo(tx, existing?.seoId ?? null, data.seo)

      const postData = {
        slug,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        status: data.status,
        heroImageId: data.heroImageId ?? null,
        categoryId: data.categoryId ?? null,
        destinationId: data.destinationId ?? null,
        readingTime: readingTimeMinutes(data.content),
        featured: data.featured,
        publishedAt,
        archivedAt: data.status === 'ARCHIVED' ? new Date() : null,
        seoId,
      }

      const post = existing
        ? await tx.blogPost.update({
            where: { id: existing.id },
            data: postData,
            select: { id: true, slug: true },
          })
        : await tx.blogPost.create({
            data: { ...postData, authorId: session.id },
            select: { id: true, slug: true },
          })

      await tx.blogPostTag.deleteMany({ where: { postId: post.id } })
      if (data.tagIds.length) {
        await tx.blogPostTag.createMany({
          data: data.tagIds.map((tagId) => ({ postId: post.id, tagId })),
          skipDuplicates: true,
        })
      }

      await tx.faq.deleteMany({ where: { blogPostId: post.id } })
      if (data.faqs.length) {
        await tx.faq.createMany({
          data: data.faqs.map((faq, index) => ({
            scope: 'BLOG' as const,
            blogPostId: post.id,
            question: faq.question,
            answer: faq.answer,
            sortOrder: faq.sortOrder || index,
          })),
        })
      }

      return post
    })

    await recordAudit({
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'BlogPost',
      entityId: result.id,
      summary: `Artículo ${existing ? 'actualizado' : 'creado'}: ${data.title}`,
      before: existing ? { slug: existing.slug, status: existing.status } : undefined,
      after: { slug: result.slug, status: data.status },
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/blog')
    await revalidateEntity('blogPost', result.slug)
    if (existing && existing.slug !== result.slug) {
      await revalidateEntity('blogPost', existing.slug)
    }

    return actionOk({ id: result.id })
  } catch (error) {
    log.error('Blog post save failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function setBlogPostStatusAction(
  postId: string,
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED',
): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('blog:publish')

    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { slug: true, title: true, status: true, publishedAt: true },
    })
    if (!post) return actionError('NOT_FOUND', 'El artículo no existe.')

    await prisma.blogPost.update({
      where: { id: postId },
      data: {
        status,
        publishedAt: status === 'PUBLISHED' ? (post.publishedAt ?? new Date()) : post.publishedAt,
        archivedAt: status === 'ARCHIVED' ? new Date() : null,
      },
    })

    await recordAudit({
      action: status === 'PUBLISHED' ? 'PUBLISH' : status === 'ARCHIVED' ? 'ARCHIVE' : 'UNPUBLISH',
      entityType: 'BlogPost',
      entityId: postId,
      summary: `${post.title}: ${post.status} → ${status}`,
      before: { status: post.status },
      after: { status },
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/blog')
    await revalidateEntity('blogPost', post.slug)

    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function moderateReviewAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('reviews:update')

    const parsed = reviewModerationSchema.safeParse(input)
    if (!parsed.success) return actionError('VALIDATION_ERROR', 'Datos inválidos.')

    const { reviewId, status, moderationNotes } = parsed.data

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true, status: true, authorName: true,
        tour: { select: { slug: true } },
        hotel: { select: { slug: true } },
        business: { select: { slug: true } },
      },
    })
    if (!review) return actionError('NOT_FOUND', 'La reseña no existe.')

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status,
        moderationNotes: moderationNotes ?? null,
        publishedAt: status === 'APPROVED' ? new Date() : null,
      },
    })

    await recordAudit({
      action: status === 'APPROVED' ? 'APPROVE' : 'REJECT',
      entityType: 'Review',
      entityId: reviewId,
      summary: `Reseña de ${review.authorName}: ${review.status} → ${status}`,
      before: { status: review.status },
      after: { status },
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/reviews')

    // Approving a review changes the entity's rating summary and its
    // structured data, so the public page must be purged.
    if (review.tour) await revalidateEntity('tour', review.tour.slug)
    if (review.hotel) await revalidateEntity('hotel', review.hotel.slug)
    if (review.business) await revalidateEntity('business', review.business.slug)

    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

// ── Destinations, hotels, categories, pages ────────────────────────────────

export async function saveDestinationAction(
  destinationId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission(destinationId ? 'destinations:update' : 'destinations:create')

    const parsed = destinationSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos del destino.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const existing = destinationId
      ? await prisma.destination.findUnique({
          where: { id: destinationId },
          select: { id: true, slug: true, status: true, publishedAt: true, seoId: true },
        })
      : null

    const slug =
      existing && slugify(data.slug) === existing.slug
        ? existing.slug
        : await uniqueSlug(data.slug || data.name, async (candidate) => {
            const clash = await prisma.destination.findFirst({
              where: { slug: candidate, ...(destinationId ? { id: { not: destinationId } } : {}) },
              select: { id: true },
            })
            return Boolean(clash)
          })

    const result = await prisma.$transaction(async (tx) => {
      const seoId = await upsertSeo(tx, existing?.seoId ?? null, data.seo)

      const payload = {
        slug,
        name: data.name,
        shortIntro: data.shortIntro,
        description: data.description,
        status: data.status,
        region: data.region,
        country: data.country,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        heroImageId: data.heroImageId ?? null,
        featured: data.featured,
        sortOrder: data.sortOrder,
        publishedAt:
          data.status === 'PUBLISHED' ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
        seoId,
      }

      return existing
        ? tx.destination.update({ where: { id: existing.id }, data: payload, select: { id: true, slug: true } })
        : tx.destination.create({ data: payload, select: { id: true, slug: true } })
    })

    await recordAudit({
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'Destination',
      entityId: result.id,
      summary: `Destino ${existing ? 'actualizado' : 'creado'}: ${data.name}`,
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/destinations')
    await revalidateEntity('destination', result.slug)

    return actionOk({ id: result.id })
  } catch (error) {
    log.error('Destination save failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function saveHotelAction(
  hotelId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission(hotelId ? 'hotels:update' : 'hotels:create')

    const parsed = hotelSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos del alojamiento.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const existing = hotelId
      ? await prisma.hotel.findUnique({
          where: { id: hotelId },
          select: { id: true, slug: true, publishedAt: true, seoId: true },
        })
      : null

    const slug =
      existing && slugify(data.slug) === existing.slug
        ? existing.slug
        : await uniqueSlug(data.slug || data.name, async (candidate) => {
            const clash = await prisma.hotel.findFirst({
              where: { slug: candidate, ...(hotelId ? { id: { not: hotelId } } : {}) },
              select: { id: true },
            })
            return Boolean(clash)
          })

    const result = await prisma.$transaction(async (tx) => {
      const seoId = await upsertSeo(tx, existing?.seoId ?? null, data.seo)

      const payload = {
        slug,
        name: data.name,
        summary: data.summary,
        description: data.description,
        status: data.status,
        starRating: data.starRating ?? null,
        address: data.address || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        fromPriceCents: data.fromPrice !== null && data.fromPrice !== undefined
          ? Math.round(data.fromPrice * 100)
          : null,
        destinationId: data.destinationId ?? null,
        featured: data.featured,
        publishedAt:
          data.status === 'PUBLISHED' ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
        archivedAt: data.status === 'ARCHIVED' ? new Date() : null,
        seoId,
      }

      const hotel = existing
        ? await tx.hotel.update({ where: { id: existing.id }, data: payload, select: { id: true, slug: true } })
        : await tx.hotel.create({ data: payload, select: { id: true, slug: true } })

      await tx.hotelAmenityOnHotel.deleteMany({ where: { hotelId: hotel.id } })
      if (data.amenityIds.length) {
        await tx.hotelAmenityOnHotel.createMany({
          data: data.amenityIds.map((amenityId) => ({ hotelId: hotel.id, amenityId })),
          skipDuplicates: true,
        })
      }

      return hotel
    })

    await recordAudit({
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'Hotel',
      entityId: result.id,
      summary: `Alojamiento ${existing ? 'actualizado' : 'creado'}: ${data.name}`,
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/hotels')
    await revalidateEntity('hotel', result.slug)

    return actionOk({ id: result.id })
  } catch (error) {
    log.error('Hotel save failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function saveCategoryAction(
  categoryId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission(categoryId ? 'categories:update' : 'categories:create')

    const parsed = tourCategorySchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos de la categoría.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const existing = categoryId
      ? await prisma.tourCategory.findUnique({
          where: { id: categoryId },
          select: { id: true, slug: true, seoId: true },
        })
      : null

    const slug =
      existing && slugify(data.slug) === existing.slug
        ? existing.slug
        : await uniqueSlug(data.slug || data.name, async (candidate) => {
            const clash = await prisma.tourCategory.findFirst({
              where: { slug: candidate, ...(categoryId ? { id: { not: categoryId } } : {}) },
              select: { id: true },
            })
            return Boolean(clash)
          })

    const result = await prisma.$transaction(async (tx) => {
      const seoId = await upsertSeo(tx, existing?.seoId ?? null, data.seo)

      const payload = {
        slug,
        name: data.name,
        description: data.description || null,
        channel: data.channel,
        status: data.status,
        sortOrder: data.sortOrder,
        imageId: data.imageId ?? null,
        seoId,
      }

      return existing
        ? tx.tourCategory.update({ where: { id: existing.id }, data: payload, select: { id: true } })
        : tx.tourCategory.create({ data: payload, select: { id: true } })
    })

    await recordAudit({
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'TourCategory',
      entityId: result.id,
      summary: `Categoría ${existing ? 'actualizada' : 'creada'}: ${data.name}`,
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/categories')
    await revalidateEntity('tour')

    return actionOk({ id: result.id })
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function saveStaticPageAction(
  pageId: string,
  input: unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('settings:update')

    const parsed = staticPageSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá el contenido de la página.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const existing = await prisma.staticPage.findUnique({
      where: { id: pageId },
      select: { id: true, slug: true, title: true, seoId: true },
    })
    if (!existing) return actionError('NOT_FOUND', 'La página no existe.')

    await prisma.$transaction(async (tx) => {
      const seoId = await upsertSeo(tx, existing.seoId, data.seo)

      await tx.staticPage.update({
        where: { id: pageId },
        data: {
          title: data.title,
          content: data.content,
          status: data.status,
          seoId,
        },
      })
    })

    await recordAudit({
      action: 'UPDATE',
      entityType: 'StaticPage',
      entityId: pageId,
      summary: `Página legal actualizada: ${data.title}`,
      before: { title: existing.title },
      after: { title: data.title, status: data.status },
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/settings/pages')
    await revalidateEntity('staticPage', existing.slug)

    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function updateSiteSettingAction(
  key: string,
  value: unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('settings:update')

    const existing = await prisma.siteSetting.findUnique({ where: { key }, select: { value: true } })

    await prisma.siteSetting.update({
      where: { key },
      data: { value: value as object },
    })

    await recordAudit({
      action: 'UPDATE',
      entityType: 'SiteSetting',
      entityId: key,
      summary: `Ajuste actualizado: ${key}`,
      before: existing?.value,
      after: value,
      actorId: session.id,
      actorEmail: session.email,
    })

    await revalidateEntity('siteSetting')

    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

/**
 * Sends a test message to the signed-in administrator.
 *
 * Reports the true outcome: when no SMTP credentials are configured the
 * transport returns `delivered: false` and this surfaces that, rather than
 * showing a success message for mail that was only logged.
 */
export async function sendTestEmailAction(
  to: string,
): Promise<ActionResult<{ delivered: boolean; detail: string }>> {
  try {
    const session = await requirePermission('settings:read')

    const { sendTestEmail } = await import('@vamos/email')
    const result = await sendTestEmail(to)

    await recordAudit({
      action: 'UPDATE',
      entityType: 'SiteSetting',
      entityId: 'email.test',
      summary: `Prueba de correo a ${to}: ${result.delivered ? 'entregada' : 'no entregada'}`,
      actorId: session.id,
      actorEmail: session.email,
    })

    if (result.delivered) {
      return actionOk({
        delivered: true,
        detail: `Enviado correctamente (id ${result.messageId}). Revisá la bandeja de ${to}, incluida la carpeta de spam.`,
      })
    }

    return actionOk({
      delivered: false,
      detail:
        result.reason === 'not_configured'
          ? 'No se envió: falta configurar SMTP_PASSWORD o EMAIL_TRANSPORT sigue en "console". El mensaje solo se registró en el log.'
          : `El servidor de correo rechazó el envío: ${result.error ?? 'sin detalle'}`,
    })
  } catch (error) {
    log.error('Test email failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
