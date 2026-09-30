/**
 * Form-shape mapping for the tour editor.
 *
 * Deliberately NOT a client module. Next.js turns every export of a
 * `'use client'` file into a client reference, so a Server Component cannot
 * call a function defined there - the edit page needs `tourToFormData()` while
 * rendering on the server.
 *
 * Keeping the mapping here also draws the right line: converting a database
 * row into a form's draft shape is data work, not UI work.
 */

import { fromCents } from '@vamos/shared'

type OptionDraft = {
  id?: string
  name: string
  description: string
  price: number
  childPrice: string
  currency: string
  durationMinutes: number
  capacity: number
  minParticipants: number
  maxParticipants: number
  pickupIncluded: boolean
  departureTimes: string
  freeCancellationHours: number
  isActive: boolean
}

type StepDraft = { id?: string; title: string; description: string; timeLabel: string }
type PickupDraft = { id?: string; name: string; address: string; offsetMinutes: number; extraCost: number; isActive: boolean }
type FaqDraft = { id?: string; question: string; answer: string; isPublished: boolean }

export type TourFormData = {
  id?: string
  name: string
  slug: string
  summary: string
  description: string
  status: string
  categoryId: string
  destinationId: string
  durationMinutes: number
  difficulty: string
  location: string
  minAge: string
  maxGroupSize: string
  languages: string
  highlights: string
  included: string
  excluded: string
  importantInfo: string
  cancellationPolicy: string
  featured: boolean
  sortOrder: number
  imageIds: string[]
  coverImageId: string
  options: OptionDraft[]
  itinerary: StepDraft[]
  pickupLocations: PickupDraft[]
  faqs: FaqDraft[]
  seo: {
    title: string
    description: string
    canonicalUrl: string
    ogTitle: string
    ogDescription: string
    ogImageUrl: string
    noindex: boolean
    nofollow: boolean
  }
}

export const EMPTY_TOUR: TourFormData = {
  name: '', slug: '', summary: '', description: '', status: 'DRAFT',
  categoryId: '', destinationId: '', durationMinutes: 240, difficulty: 'EASY',
  location: '', minAge: '', maxGroupSize: '', languages: 'Español, Inglés',
  highlights: '', included: '', excluded: '', importantInfo: '', cancellationPolicy: '',
  featured: false, sortOrder: 0,
  imageIds: [], coverImageId: '',
  options: [
    {
      name: 'Regular', description: '', price: 0, childPrice: '', currency: 'ARS',
      durationMinutes: 240, capacity: 20, minParticipants: 1, maxParticipants: 20,
      pickupIncluded: true, departureTimes: '', freeCancellationHours: 24, isActive: true,
    },
  ],
  itinerary: [],
  pickupLocations: [],
  faqs: [],
  seo: {
    title: '', description: '', canonicalUrl: '', ogTitle: '',
    ogDescription: '', ogImageUrl: '', noindex: false, nofollow: false,
  },
}

/** Converts a persisted tour into the form's draft shape. */
export function tourToFormData(tour: {
  id: string
  name: string
  slug: string
  summary: string
  description: string
  status: string
  categoryId: string
  destinationId: string | null
  durationMinutes: number
  difficulty: string
  location: string | null
  minAge: number | null
  maxGroupSize: number | null
  languages: string[]
  highlights: string[]
  included: string[]
  excluded: string[]
  importantInfo: string | null
  cancellationPolicy: string | null
  featured: boolean
  sortOrder: number
  images: { mediaId: string; isCover: boolean; sortOrder: number }[]
  options: {
    id: string; name: string; description: string | null; priceCents: number
    childPriceCents: number | null; currency: string; durationMinutes: number
    capacity: number; minParticipants: number; maxParticipants: number
    pickupIncluded: boolean; departureTimes: string[]; freeCancellationHours: number
    isActive: boolean
  }[]
  itinerary: { id: string; title: string; description: string; timeLabel: string | null }[]
  pickupLocations: {
    id: string; name: string; address: string | null; offsetMinutes: number
    extraCostCents: number; isActive: boolean
  }[]
  faqs: { id: string; question: string; answer: string; isPublished: boolean }[]
  seo: {
    title: string | null; description: string | null; canonicalUrl: string | null
    ogTitle: string | null; ogDescription: string | null; ogImageUrl: string | null
    noindex: boolean; nofollow: boolean
  } | null
}): TourFormData {
  return {
    id: tour.id,
    name: tour.name,
    slug: tour.slug,
    summary: tour.summary,
    description: tour.description,
    status: tour.status,
    categoryId: tour.categoryId,
    destinationId: tour.destinationId ?? '',
    durationMinutes: tour.durationMinutes,
    difficulty: tour.difficulty,
    location: tour.location ?? '',
    minAge: tour.minAge !== null ? String(tour.minAge) : '',
    maxGroupSize: tour.maxGroupSize !== null ? String(tour.maxGroupSize) : '',
    languages: tour.languages.join(', '),
    highlights: tour.highlights.join('\n'),
    included: tour.included.join('\n'),
    excluded: tour.excluded.join('\n'),
    importantInfo: tour.importantInfo ?? '',
    cancellationPolicy: tour.cancellationPolicy ?? '',
    featured: tour.featured,
    sortOrder: tour.sortOrder,
    imageIds: [...tour.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => image.mediaId),
    coverImageId: tour.images.find((image) => image.isCover)?.mediaId ?? '',
    options: tour.options.map((option) => ({
      id: option.id,
      name: option.name,
      description: option.description ?? '',
      price: fromCents(option.priceCents),
      childPrice: option.childPriceCents !== null ? String(fromCents(option.childPriceCents)) : '',
      currency: option.currency,
      durationMinutes: option.durationMinutes,
      capacity: option.capacity,
      minParticipants: option.minParticipants,
      maxParticipants: option.maxParticipants,
      pickupIncluded: option.pickupIncluded,
      departureTimes: option.departureTimes.join(', '),
      freeCancellationHours: option.freeCancellationHours,
      isActive: option.isActive,
    })),
    itinerary: tour.itinerary.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      timeLabel: step.timeLabel ?? '',
    })),
    pickupLocations: tour.pickupLocations.map((location) => ({
      id: location.id,
      name: location.name,
      address: location.address ?? '',
      offsetMinutes: location.offsetMinutes,
      extraCost: fromCents(location.extraCostCents),
      isActive: location.isActive,
    })),
    faqs: tour.faqs.map((faq) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      isPublished: faq.isPublished,
    })),
    seo: {
      title: tour.seo?.title ?? '',
      description: tour.seo?.description ?? '',
      canonicalUrl: tour.seo?.canonicalUrl ?? '',
      ogTitle: tour.seo?.ogTitle ?? '',
      ogDescription: tour.seo?.ogDescription ?? '',
      ogImageUrl: tour.seo?.ogImageUrl ?? '',
      noindex: tour.seo?.noindex ?? false,
      nofollow: tour.seo?.nofollow ?? false,
    },
  }
}

