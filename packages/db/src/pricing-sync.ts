import { prisma } from './client.ts'

/**
 * Recomputes `Tour.fromPriceCents` — the denormalised "desde" price shown on
 * listing cards — from the tour's active options.
 *
 * Listing pages filter and sort by price across the whole catalogue. Doing
 * that through a join on tour_options would mean an aggregate per row, so the
 * cheapest active price is denormalised onto the tour and refreshed here
 * whenever options change. Call it from every mutation that creates, updates,
 * deactivates or deletes a TourOption.
 */
export async function syncTourFromPrice(tourId: string): Promise<number | null> {
  const cheapest = await prisma.tourOption.findFirst({
    where: { tourId, isActive: true },
    orderBy: { priceCents: 'asc' },
    select: { priceCents: true, currency: true },
  })

  await prisma.tour.update({
    where: { id: tourId },
    data: {
      fromPriceCents: cheapest?.priceCents ?? null,
      ...(cheapest ? { currency: cheapest.currency } : {}),
    },
  })

  return cheapest?.priceCents ?? null
}

/** Convenience for backfills and tests: resync every tour in the catalogue. */
export async function syncAllTourFromPrices(): Promise<number> {
  const tours = await prisma.tour.findMany({ select: { id: true } })
  for (const tour of tours) {
    await syncTourFromPrice(tour.id)
  }
  return tours.length
}
