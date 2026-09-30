/**
 * Model and enum re-exports.
 *
 * Model shapes come from `@vamos/db` as TYPE-ONLY imports, which TypeScript
 * erases — they add no runtime dependency.
 *
 * The enums are runtime VALUES, so they are imported from the generated enums
 * module directly rather than through the `@vamos/db` barrel. That barrel
 * constructs the Prisma client, which would make every consumer of a type —
 * including a pure unit test — require a live DATABASE_URL.
 */
export type {
  AdminUser,
  AdminSession,
  Role,
  Permission as PermissionRow,
  RolePermission,
  AuditLog,
  SeoMetadata,
  Media,
  Destination,
  Attraction,
  TourCategory,
  Tour,
  TourImage,
  TourVideo,
  TourItineraryStep,
  TourOption,
  TourAvailability,
  TourPickupLocation,
  Customer,
  Booking,
  BookingItem,
  BookingPassenger,
  Payment,
  WebhookEvent,
  Hotel,
  HotelAmenity,
  HotelImage,
  HotelVideo,
  Business,
  BusinessCategory,
  BusinessImage,
  HotelSubmission,
  BlogPost,
  BlogCategory,
  BlogTag,
  Review,
  Faq,
  StaticPage,
  ContactSubmission,
  SiteSetting,
} from '@vamos/db'

export {
  AdminRole,
  ContentStatus,
  BookingStatus,
  PaymentStatus,
  PaymentProvider,
  SubmissionStatus,
  ReviewStatus,
  ContactStatus,
  Difficulty,
  MediaType,
  PassengerType,
  FaqScope,
  AuditAction,
} from '@vamos/db/enums'
