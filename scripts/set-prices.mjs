/**
 * Applies the current rates the operator has confirmed.
 *
 * The catalogue loader (`load-catalog.mjs`) carries the figures from the
 * original brief, which date from May 2023. This script sits on top of it and
 * applies only rates that have been confirmed since, so re-running the loader
 * never silently reverts a current price to a stale one: run the loader, then
 * run this.
 *
 * Nothing here is derived, scaled or inflated from an older figure. A tour
 * appears below only when someone supplied the number.
 *
 *   node --experimental-strip-types scripts/set-prices.mjs
 */
import { prisma, syncTourFromPrice } from '../packages/db/src/index.ts'

/** Pesos → centavos. */
const ARS = (pesos) => Math.round(pesos * 100)

/**
 * Keyed by tour slug. `tiers` matches a price band by the label prefix, so a
 * band can be renamed without silently stop matching - a miss is reported.
 *
 * `rates` are seasonal: they replace the standing price for departures inside
 * the range. Overlapping ranges are allowed; the narrowest one wins.
 */
const PRICES = [
  {
    slug: 'minitrekking-perito-moreno',
    source: 'Confirmado por el operador (octubre 2026)',
    tiers: [
      {
        match: 'Adultos',
        price: 395000,
        rates: [{ label: 'Noviembre', from: '2026-11-01', to: '2026-11-30', price: 420000 }],
      },
    ],
  },
]

async function main() {
  let changed = 0
  const warnings = []

  for (const entry of PRICES) {
    const tour = await prisma.tour.findFirst({
      where: { slug: entry.slug },
      select: {
        id: true,
        name: true,
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            priceTiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, label: true } },
          },
        },
      },
    })

    if (!tour) {
      warnings.push(`No existe el tour "${entry.slug}".`)
      continue
    }

    for (const option of tour.options) {
      for (const wanted of entry.tiers) {
        const tier = option.priceTiers.find((t) => t.label.startsWith(wanted.match))
        if (!tier) {
          warnings.push(`${tour.name} / ${option.name}: no hay banda que empiece con "${wanted.match}".`)
          continue
        }

        await prisma.tourPriceTier.update({
          where: { id: tier.id },
          data: { priceCents: ARS(wanted.price) },
        })

        // Rates are replaced wholesale: a season removed from this file is a
        // season that should no longer be charged.
        await prisma.tourPriceRate.deleteMany({ where: { tierId: tier.id } })
        for (const rate of wanted.rates ?? []) {
          await prisma.tourPriceRate.create({
            data: {
              tierId: tier.id,
              label: rate.label ?? null,
              startDate: new Date(`${rate.from}T00:00:00.000Z`),
              endDate: new Date(`${rate.to}T00:00:00.000Z`),
              priceCents: ARS(rate.price),
            },
          })
        }

        // `TourOption.priceCents` mirrors the first band and is what
        // `syncTourFromPrice` reads for the listing "desde" price.
        if (option.priceTiers[0]?.id === tier.id) {
          await prisma.tourOption.update({
            where: { id: option.id },
            data: { priceCents: ARS(wanted.price) },
          })
        }

        changed += 1
        console.log(
          `· ${tour.name} / ${option.name} / ${tier.label}: $${wanted.price.toLocaleString('es-AR')}` +
            (wanted.rates?.length ? ` (+${wanted.rates.length} tarifa/s de temporada)` : ''),
        )
      }
    }

    // The denormalised "desde" price the listing pages sort and filter on.
    await syncTourFromPrice(tour.id)
  }

  console.log(`\n${changed} banda/s actualizada/s.`)
  for (const warning of warnings) console.warn(`⚠ ${warning}`)
}

await main()
await prisma.$disconnect()
