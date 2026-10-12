import type {
  Attraction,
  BlogCategory,
  BlogPost,
  BlogTag,
  Business,
  BusinessCategory,
  BusinessImage,
  Destination,
  Faq,
  Hotel,
  HotelAmenity,
  HotelImage,
  Media,
  Review,
  SeoMetadata,
  Tour,
  TourCategory,
  TourImage,
  TourItineraryStep,
  TourExtra,
  TourOption,
  TourPriceRate,
  TourPriceTier,
  TourPickupLocation,
  TourVideo,
} from './models.ts'

/**
 * Composite read models.
 *
 * Each shape matches exactly one Prisma `include`, so a page fetches the data
 * it renders and nothing more. Defining them here keeps the query and the
 * component contract from drifting apart.
 */

/**
 * The shape every image-rendering component receives.
 *
 * The licence fields are not optional extras: CC BY and CC BY-SA oblige us to
 * name the author and the licence wherever the work is shown, so they travel
 * with the image rather than being looked up separately and forgotten.
 */
export type MediaRef = Pick<
  Media,
  | 'id'
  | 'url'
  // Distinguishes a stored video from an image, and a self-hosted video from
  // one embedded elsewhere: a self-hosted row keeps its poster in externalUrl.
  | 'mimeType'
  | 'altText'
  | 'caption'
  | 'width'
  | 'height'
  | 'blurDataUrl'
  | 'externalUrl'
  | 'license'
  | 'attributionText'
  | 'attributionUrl'
  | 'sourceUrl'
>

export type TourImageWithMedia = TourImage & { media: MediaRef }
export type TourVideoWithMedia = TourVideo & { media: MediaRef }

export type TourPriceRateRef = Pick<TourPriceRate, 'label' | 'startDate' | 'endDate' | 'priceCents'>

/** An add-on, with the photo that the highlighted upgrade panel needs. */
export type TourExtraWithMedia = TourExtra & { media: MediaRef | null }

/** Everything the `/excursiones/[slug]` page renders. */
export type TourDetail = Tour & {
  category: Pick<TourCategory, 'id' | 'slug' | 'name' | 'channel'>
  destination: Pick<Destination, 'id' | 'slug' | 'name'> | null
  seo: SeoMetadata | null
  images: TourImageWithMedia[]
  videos: TourVideoWithMedia[]
  /**
   * Bands carry their seasonal rates so the booking widget can price the date
   * the visitor picks without a round trip per date. The server re-prices the
   * booking from the same rows, so the preview can never become the charge.
   */
  options: (TourOption & { priceTiers: (TourPriceTier & { rates: TourPriceRateRef[] })[] })[]
  extras: TourExtraWithMedia[]
  itinerary: TourItineraryStep[]
  pickupLocations: TourPickupLocation[]
  faqs: Faq[]
  reviews: Review[]
}

/** The subset a listing card needs - deliberately narrow to keep lists cheap. */
export type TourCard = Pick<
  Tour,
  | 'id'
  | 'slug'
  | 'name'
  | 'summary'
  | 'fromPriceCents'
  | 'currency'
  | 'durationMinutes'
  | 'difficulty'
  | 'location'
  | 'featured'
> & {
  category: Pick<TourCategory, 'slug' | 'name' | 'channel'>
  images: { media: MediaRef }[]
  averageRating?: number | null
  reviewCount?: number
}

export type HotelDetail = Hotel & {
  destination: Pick<Destination, 'id' | 'slug' | 'name'> | null
  seo: SeoMetadata | null
  images: (HotelImage & { media: MediaRef })[]
  amenities: { amenity: HotelAmenity }[]
  reviews: Review[]
}

export type HotelCard = Pick<
  Hotel,
  'id' | 'slug' | 'name' | 'summary' | 'starRating' | 'fromPriceCents' | 'currency' | 'address'
> & {
  images: { media: MediaRef }[]
}

export type BusinessDetail = Business & {
  category: BusinessCategory
  destination: Pick<Destination, 'id' | 'slug' | 'name'> | null
  seo: SeoMetadata | null
  images: (BusinessImage & { media: MediaRef })[]
  reviews: Review[]
}

export type BusinessCard = Pick<
  Business,
  'id' | 'slug' | 'name' | 'summary' | 'address' | 'priceRange'
> & {
  category: Pick<BusinessCategory, 'slug' | 'name' | 'channel'>
  images: { media: MediaRef }[]
}

export type DestinationDetail = Destination & {
  heroImage: MediaRef | null
  seo: SeoMetadata | null
  attractions: (Attraction & { image: MediaRef | null })[]
  faqs: Faq[]
}

export type DestinationCard = Pick<
  Destination,
  'id' | 'slug' | 'name' | 'shortIntro' | 'featured'
> & {
  heroImage: MediaRef | null
}

export type BlogPostDetail = BlogPost & {
  heroImage: MediaRef | null
  category: BlogCategory | null
  destination: Pick<Destination, 'id' | 'slug' | 'name'> | null
  author: { id: string; name: string } | null
  seo: SeoMetadata | null
  tags: { tag: BlogTag }[]
  faqs: Faq[]
}

export type BlogPostCard = Pick<
  BlogPost,
  'id' | 'slug' | 'title' | 'excerpt' | 'readingTime' | 'publishedAt' | 'featured'
> & {
  heroImage: MediaRef | null
  category: Pick<BlogCategory, 'slug' | 'name'> | null
}

/** Aggregated rating used on cards and in Product structured data. */
export type RatingSummary = {
  average: number
  count: number
}

/** Uniform pagination envelope for every listing query. */
export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
