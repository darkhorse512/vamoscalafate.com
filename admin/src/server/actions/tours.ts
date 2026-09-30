'use server'

import { revalidatePath } from 'next/cache'
import { prisma, syncTourFromPrice } from '@vamos/db'
import {
  actionError, actionOk, logger, slugify, toPublicError, uniqueSlug, type ActionResult,
} from '@vamos/shared'
import { availabilityGenerateSchema, tourSchema } from '@vamos/validation'
import { requirePermission } from '../auth'
import { recordAudit } from '../audit'
import { revalidateEntity } from '../revalidate'

const log = logger.scoped('admin:tours')

const toCents = (amount: number) => Math.round(amount * 100)

/**
 * Tour management.
 *
 * A tour is an aggregate: options, itinerary, pickups, FAQs, images and SEO
 * are written together in one transaction, so a partially-saved product can
 * never reach the catalogue.
 *
 * After every successful write the public site's cache tags are purged, which
 * is what makes an edit visible immediately without a rebuild (spec §45, §76).
 */

export async function createTourAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission('tours:create')

    const parsed = tourSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos de la excursión.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const slug = await uniqueSlug(data.slug || data.name, async (candidate) => {
      const existing = await prisma.tour.findUnique({ where: { slug: candidate }, select: { id: true } })
      return Boolean(existing)
    })

    const tour = await prisma.$transaction(async (tx) => {
      const seo = data.seo
        ? await tx.seoMetadata.create({
            data: {
              title: data.seo.title || null,
              description: data.seo.description || null,
              canonicalUrl: data.seo.canonicalUrl || null,
              ogTitle: data.seo.ogTitle || null,
              ogDescription: data.seo.ogDescription || null,
              ogImageUrl: data.seo.ogImageUrl || null,
              noindex: data.seo.noindex,
              nofollow: data.seo.nofollow,
            },
            select: { id: true },
          })
        : null

      const created = await tx.tour.create({
        data: {
          slug,
          name: data.name,
          summary: data.summary,
          description: data.description,
          status: data.status,
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
          categoryId: data.categoryId,
          destinationId: data.destinationId ?? null,
          durationMinutes: data.durationMinutes,
          difficulty: data.difficulty,
          location: data.location || null,
          minAge: data.minAge ?? null,
          maxGroupSize: data.maxGroupSize ?? null,
          languages: data.languages,
          highlights: data.highlights,
          included: data.included,
          excluded: data.excluded,
          importantInfo: data.importantInfo || null,
          cancellationPolicy: data.cancellationPolicy || null,
          featured: data.featured,
          sortOrder: data.sortOrder,
          seoId: seo?.id ?? null,

          options: {
            create: data.options.map((option, index) => ({
              name: option.name,
              description: option.description || null,
              priceCents: toCents(option.price),
              childPriceCents: option.childPrice !== undefined ? toCents(option.childPrice) : null,
              currency: option.currency,
              durationMinutes: option.durationMinutes,
              capacity: option.capacity,
              minParticipants: option.minParticipants,
              maxParticipants: option.maxParticipants,
              pickupIncluded: option.pickupIncluded,
              departureTimes: option.departureTimes,
              freeCancellationHours: option.freeCancellationHours,
              cancellationNote: option.cancellationNote || null,
              isActive: option.isActive,
              sortOrder: option.sortOrder || index,
            })),
          },

          itinerary: {
            create: data.itinerary.map((step, index) => ({
              title: step.title,
              description: step.description,
              timeLabel: step.timeLabel || null,
              sortOrder: step.sortOrder || index,
            })),
          },

          pickupLocations: {
            create: data.pickupLocations.map((location, index) => ({
              name: location.name,
              address: location.address || null,
              offsetMinutes: location.offsetMinutes,
              extraCostCents: toCents(location.extraCost),
              isActive: location.isActive,
              sortOrder: location.sortOrder || index,
            })),
          },

          faqs: {
            create: data.faqs.map((faq, index) => ({
              scope: 'TOUR' as const,
              question: faq.question,
              answer: faq.answer,
              sortOrder: faq.sortOrder || index,
              isPublished: faq.isPublished,
            })),
          },

          ...(data.imageIds.length
            ? {
                images: {
                  create: data.imageIds.map((mediaId, index) => ({
                    mediaId,
                    sortOrder: index,
                    isCover: data.coverImageId ? mediaId === data.coverImageId : index === 0,
                  })),
                },
              }
            : {}),

          ...(data.videoIds.length
            ? { videos: { create: data.videoIds.map((mediaId, i) => ({ mediaId, sortOrder: i })) } }
            : {}),
        },
        select: { id: true, slug: true, name: true },
      })

      if (data.relatedTourIds.length) {
        await tx.tourRelation.createMany({
          data: data.relatedTourIds
            .filter((targetId) => targetId !== created.id)
            .map((targetId, index) => ({ sourceId: created.id, targetId, sortOrder: index })),
          skipDuplicates: true,
        })
      }

      return created
    })

    // Denormalised "from" price, used by every listing query.
    await syncTourFromPrice(tour.id)

    await recordAudit({
      action: 'CREATE',
      entityType: 'Tour',
      entityId: tour.id,
      summary: `Excursión creada: ${tour.name}`,
      after: { slug: tour.slug, name: tour.name, status: data.status },
      actorId: session.id,
      actorEmail: session.email,
    })

    log.info('Tour created', { tourId: tour.id, slug: tour.slug, actorId: session.id })

    revalidatePath('/tours')
    await revalidateEntity('tour', tour.slug)

    return actionOk({ id: tour.id })
  } catch (error) {
    log.error('Tour creation failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function updateTourAction(
  tourId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission('tours:update')

    const parsed = tourSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos de la excursión.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const existing = await prisma.tour.findUnique({
      where: { id: tourId },
      select: {
        id: true, slug: true, name: true, status: true, publishedAt: true, seoId: true,
      },
    })

    if (!existing) return actionError('NOT_FOUND', 'La excursión no existe.')

    // Slug changes break inbound links, so only regenerate when it actually
    // differs, and keep it unique against other rows.
    const nextSlug =
      slugify(data.slug) === existing.slug
        ? existing.slug
        : await uniqueSlug(data.slug || data.name, async (candidate) => {
            const clash = await prisma.tour.findFirst({
              where: { slug: candidate, id: { not: tourId } },
              select: { id: true },
            })
            return Boolean(clash)
          })

    await prisma.$transaction(async (tx) => {
      // SEO row is created lazily on first save.
      let seoId = existing.seoId
      if (data.seo) {
        const seoData = {
          title: data.seo.title || null,
          description: data.seo.description || null,
          canonicalUrl: data.seo.canonicalUrl || null,
          ogTitle: data.seo.ogTitle || null,
          ogDescription: data.seo.ogDescription || null,
          ogImageUrl: data.seo.ogImageUrl || null,
          noindex: data.seo.noindex,
          nofollow: data.seo.nofollow,
        }

        if (seoId) {
          await tx.seoMetadata.update({ where: { id: seoId }, data: seoData })
        } else {
          const created = await tx.seoMetadata.create({ data: seoData, select: { id: true } })
          seoId = created.id
        }
      }

      await tx.tour.update({
        where: { id: tourId },
        data: {
          slug: nextSlug,
          name: data.name,
          summary: data.summary,
          description: data.description,
          status: data.status,
          // Set publishedAt on the first publish and keep it thereafter, so
          // "published on" does not silently change on every later edit.
          publishedAt:
            data.status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
          archivedAt: data.status === 'ARCHIVED' ? new Date() : null,
          categoryId: data.categoryId,
          destinationId: data.destinationId ?? null,
          durationMinutes: data.durationMinutes,
          difficulty: data.difficulty,
          location: data.location || null,
          minAge: data.minAge ?? null,
          maxGroupSize: data.maxGroupSize ?? null,
          languages: data.languages,
          highlights: data.highlights,
          included: data.included,
          excluded: data.excluded,
          importantInfo: data.importantInfo || null,
          cancellationPolicy: data.cancellationPolicy || null,
          featured: data.featured,
          sortOrder: data.sortOrder,
          seoId,
        },
      })

      /**
       * Options are reconciled rather than replaced: deleting and recreating
       * would break the foreign keys that existing BookingItems hold, which
       * would destroy booking history.
       */
      const submittedIds = data.options.map((o) => o.id).filter(Boolean) as string[]

      await tx.tourOption.updateMany({
        where: { tourId, id: { notIn: submittedIds.length ? submittedIds : ['__none__'] } },
        data: { isActive: false },
      })

      for (const [index, option] of data.options.entries()) {
        const optionData = {
          name: option.name,
          description: option.description || null,
          priceCents: toCents(option.price),
          childPriceCents: option.childPrice !== undefined ? toCents(option.childPrice) : null,
          currency: option.currency,
          durationMinutes: option.durationMinutes,
          capacity: option.capacity,
          minParticipants: option.minParticipants,
          maxParticipants: option.maxParticipants,
          pickupIncluded: option.pickupIncluded,
          departureTimes: option.departureTimes,
          freeCancellationHours: option.freeCancellationHours,
          cancellationNote: option.cancellationNote || null,
          isActive: option.isActive,
          sortOrder: option.sortOrder || index,
        }

        if (option.id) {
          await tx.tourOption.update({ where: { id: option.id }, data: optionData })
        } else {
          await tx.tourOption.create({ data: { ...optionData, tourId } })
        }
      }

      // Itinerary, pickups and FAQs carry no foreign keys from bookings, so
      // replacing them wholesale is safe and much simpler.
      await tx.tourItineraryStep.deleteMany({ where: { tourId } })
      if (data.itinerary.length) {
        await tx.tourItineraryStep.createMany({
          data: data.itinerary.map((step, index) => ({
            tourId,
            title: step.title,
            description: step.description,
            timeLabel: step.timeLabel || null,
            sortOrder: step.sortOrder || index,
          })),
        })
      }

      // Pickup locations DO get referenced by booking items, so deactivate
      // rather than delete the ones no longer submitted.
      const submittedPickupIds = data.pickupLocations.map((p) => p.id).filter(Boolean) as string[]
      await tx.tourPickupLocation.updateMany({
        where: { tourId, id: { notIn: submittedPickupIds.length ? submittedPickupIds : ['__none__'] } },
        data: { isActive: false },
      })

      for (const [index, location] of data.pickupLocations.entries()) {
        const locationData = {
          name: location.name,
          address: location.address || null,
          offsetMinutes: location.offsetMinutes,
          extraCostCents: toCents(location.extraCost),
          isActive: location.isActive,
          sortOrder: location.sortOrder || index,
        }

        if (location.id) {
          await tx.tourPickupLocation.update({ where: { id: location.id }, data: locationData })
        } else {
          await tx.tourPickupLocation.create({ data: { ...locationData, tourId } })
        }
      }

      await tx.faq.deleteMany({ where: { tourId } })
      if (data.faqs.length) {
        await tx.faq.createMany({
          data: data.faqs.map((faq, index) => ({
            scope: 'TOUR' as const,
            tourId,
            question: faq.question,
            answer: faq.answer,
            sortOrder: faq.sortOrder || index,
            isPublished: faq.isPublished,
          })),
        })
      }

      await tx.tourImage.deleteMany({ where: { tourId } })
      if (data.imageIds.length) {
        await tx.tourImage.createMany({
          data: data.imageIds.map((mediaId, index) => ({
            tourId,
            mediaId,
            sortOrder: index,
            isCover: data.coverImageId ? mediaId === data.coverImageId : index === 0,
          })),
          skipDuplicates: true,
        })
      }

      await tx.tourVideo.deleteMany({ where: { tourId } })
      if (data.videoIds.length) {
        await tx.tourVideo.createMany({
          data: data.videoIds.map((mediaId, index) => ({ tourId, mediaId, sortOrder: index })),
          skipDuplicates: true,
        })
      }

      await tx.tourRelation.deleteMany({ where: { sourceId: tourId } })
      if (data.relatedTourIds.length) {
        await tx.tourRelation.createMany({
          data: data.relatedTourIds
            .filter((targetId) => targetId !== tourId)
            .map((targetId, index) => ({ sourceId: tourId, targetId, sortOrder: index })),
          skipDuplicates: true,
        })
      }
    })

    await syncTourFromPrice(tourId)

    await recordAudit({
      action: existing.status !== data.status && data.status === 'PUBLISHED' ? 'PUBLISH' : 'UPDATE',
      entityType: 'Tour',
      entityId: tourId,
      summary: `Excursión actualizada: ${data.name}`,
      before: { slug: existing.slug, name: existing.name, status: existing.status },
      after: { slug: nextSlug, name: data.name, status: data.status },
      actorId: session.id,
      actorEmail: session.email,
    })

    log.info('Tour updated', { tourId, actorId: session.id })

    revalidatePath('/tours')
    revalidatePath(`/tours/${tourId}`)
    // Purge both slugs when it changed, so the old URL stops serving stale HTML.
    await revalidateEntity('tour', existing.slug)
    if (nextSlug !== existing.slug) await revalidateEntity('tour', nextSlug)

    return actionOk({ id: tourId })
  } catch (error) {
    log.error('Tour update failed', error, { tourId })
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

/**
 * Archive, not delete.
 *
 * Tours are referenced by BookingItem rows. Hard-deleting one would either
 * fail on the foreign key or orphan booking history, so archiving is the only
 * correct operation (spec §12).
 */
export async function archiveTourAction(tourId: string): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('tours:delete')

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { id: true, slug: true, name: true, status: true },
    })
    if (!tour) return actionError('NOT_FOUND', 'La excursión no existe.')

    await prisma.tour.update({
      where: { id: tourId },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    })

    await recordAudit({
      action: 'ARCHIVE',
      entityType: 'Tour',
      entityId: tourId,
      summary: `Excursión archivada: ${tour.name}`,
      before: { status: tour.status },
      after: { status: 'ARCHIVED' },
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/tours')
    await revalidateEntity('tour', tour.slug)

    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function setTourStatusAction(
  tourId: string,
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED',
): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('tours:publish')

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { slug: true, name: true, status: true, publishedAt: true },
    })
    if (!tour) return actionError('NOT_FOUND', 'La excursión no existe.')

    await prisma.tour.update({
      where: { id: tourId },
      data: {
        status,
        publishedAt: status === 'PUBLISHED' ? (tour.publishedAt ?? new Date()) : tour.publishedAt,
        archivedAt: status === 'ARCHIVED' ? new Date() : null,
      },
    })

    await recordAudit({
      action: status === 'PUBLISHED' ? 'PUBLISH' : status === 'ARCHIVED' ? 'ARCHIVE' : 'UNPUBLISH',
      entityType: 'Tour',
      entityId: tourId,
      summary: `${tour.name}: ${tour.status} → ${status}`,
      before: { status: tour.status },
      after: { status },
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/tours')
    await revalidateEntity('tour', tour.slug)

    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

/** Bulk availability generation over a date range. */
export async function generateAvailabilityAction(input: unknown): Promise<ActionResult<{ created: number }>> {
  try {
    const session = await requirePermission('tours:update')

    const parsed = availabilityGenerateSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá el rango de fechas y la capacidad.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const data = parsed.data

    const option = await prisma.tourOption.findUnique({
      where: { id: data.optionId },
      select: { id: true, tourId: true, departureTimes: true, tour: { select: { name: true } } },
    })
    if (!option) return actionError('NOT_FOUND', 'La opción no existe.')

    const from = new Date(`${data.from}T00:00:00.000Z`)
    const to = new Date(`${data.to}T00:00:00.000Z`)
    const times: (string | null)[] =
      data.departureTimes.length > 0
        ? data.departureTimes
        : option.departureTimes.length > 0
          ? option.departureTimes
          : [null]

    const rows: {
      tourId: string
      optionId: string
      date: Date
      departureTime: string | null
      seatsTotal: number
      priceCentsOverride: number | null
    }[] = []

    for (let cursor = from.getTime(); cursor <= to.getTime(); cursor += 86_400_000) {
      const date = new Date(cursor)
      // 0 = Sunday. An empty weekday list means every day.
      if (data.weekdays.length > 0 && !data.weekdays.includes(date.getUTCDay())) continue

      for (const departureTime of times) {
        rows.push({
          tourId: option.tourId,
          optionId: option.id,
          date,
          departureTime,
          seatsTotal: data.seatsTotal,
          priceCentsOverride: data.priceCentsOverride ?? null,
        })
      }
    }

    // `skipDuplicates` leaves existing rows — and their seatsBooked counts —
    // untouched, so regenerating a range never wipes live inventory.
    const result = await prisma.tourAvailability.createMany({
      data: rows,
      skipDuplicates: true,
    })

    await recordAudit({
      action: 'CREATE',
      entityType: 'TourAvailability',
      entityId: option.id,
      summary: `${result.count} salidas generadas para ${option.tour.name} (${data.from} → ${data.to})`,
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath(`/tours/${option.tourId}`)

    return actionOk({ created: result.count })
  } catch (error) {
    log.error('Availability generation failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
