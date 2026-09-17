/**
 * SERVENTICA — Canonical Domain Models & Contracts
 * Explicitly typed entities for Customer, Partner, Booking, Catalog, Pricing, and Security.
 */

export type UserRole =
  | 'CUSTOMER'
  | 'PARTNER'
  | 'SUPPORT_AGENT'
  | 'OPERATIONS_AGENT'
  | 'PARTNER_MANAGER'
  | 'FINANCE'
  | 'CONTENT_MANAGER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | 'BLOCKED';

export type OnboardingStatus =
  | 'NEW'
  | 'PROFILE_INCOMPLETE'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export type AuthState =
  | 'INITIALIZING'
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATED'
  | 'ERROR';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  preferred_language: string;
  onboarding_status: OnboardingStatus;
  default_address_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerBootstrapResponse {
  user: User;
  profile: CustomerProfile;
  roles: UserRole[];
  onboarding_status: OnboardingStatus;
}

export type BookingStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'SEARCHING_PARTNER'
  | 'PARTNER_ASSIGNED'
  | 'PARTNER_ACCEPTED'
  | 'PARTNER_EN_ROUTE'
  | 'PARTNER_ARRIVED'
  | 'SERVICE_STARTED'
  | 'SERVICE_COMPLETED'
  | 'CLOSED'
  | 'PAYMENT_FAILED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_PARTNER'
  | 'CANCELLED_BY_SYSTEM'
  | 'PARTNER_NO_SHOW'
  | 'CUSTOMER_NO_SHOW'
  | 'DISPUTED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type ServicePricingType =
  | 'FIXED'
  | 'VARIANT'
  | 'ADDON'
  | 'QUANTITY'
  | 'INSPECTION_QUOTE'
  | 'DURATION_HOURLY'
  | 'RECURRING';

export interface ServiceCategory {
  id: string;
  name: string;
  short_name?: string | null;
  slug: string;
  short_description?: string | null;
  description?: string | null;
  icon?: string | null;
  icon_name?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured?: boolean;
  show_on_home?: boolean;
  tier?: number;
  parent_id?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceSubcategory {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceVariant {
  id: string;
  service_id: string;
  slug: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceAddon {
  id: string;
  service_id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceMedia {
  id: string;
  service_id: string;
  storage_path: string;
  media_type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  alt_text?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface ServiceInclusion {
  id: string;
  service_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceExclusion {
  id: string;
  service_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceFAQ {
  id: string;
  service_id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RatingSummary {
  averageRating: number;
  reviewsCount: number;
}

export interface ServiceDetails {
  service: ServiceItem;
  category: ServiceCategory;
  subcategory?: ServiceSubcategory | null;
  variants: ServiceVariant[];
  addons: ServiceAddon[];
  media: ServiceMedia[];
  inclusions: ServiceInclusion[];
  exclusions: ServiceExclusion[];
  faqs: ServiceFAQ[];
  ratingSummary: RatingSummary;
  isSaved?: boolean;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface ServiceItem {
  id: string;
  category_id: string;
  subcategory_id?: string | null;
  name: string;
  slug: string;
  short_description?: string | null;
  description: string;
  thumbnail_url?: string | null;
  hero_image_url?: string | null;
  base_price: number;
  duration_minutes: number;
  pricing_type: ServicePricingType;
  rating: number;
  reviews_count: number;
  is_active: boolean;
  sort_order?: number;
  metadata?: Record<string, any>;
  image_url?: string;
}

export interface PricingBreakdown {
  basePrice: number;
  variantsTotal: number;
  addonsTotal: number;
  quantityMultiplier: number;
  subtotal: number;
  distanceFee: number;
  surgeFee: number;
  platformFee: number;
  taxAmount: number;
  discountAmount: number;
  finalPayableAmount: number;
  currency: string;
}

export interface City {
  id: string;
  slug: string;
  name: string;
  state: string;
  country: string;
  country_code: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceArea {
  id: string;
  city_id: string;
  name: string;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius_km?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceCityAvailability {
  id: string;
  service_id: string;
  city_id: string;
  is_available: boolean;
  minimum_notice_minutes?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ServicePrice {
  id: string;
  service_id: string;
  variant_id?: string | null;
  city_id?: string | null;
  service_area_id?: string | null;
  price_type: 'FIXED' | 'STARTING_FROM' | 'HOURLY' | 'INSPECTION' | 'UNIT';
  base_price: number;
  labour_price: number;
  material_price: number;
  platform_fee: number;
  tax_inclusive: boolean;
  tax_rate: number;
  currency: string;
  effective_from: string;
  effective_until?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PriceResolutionContext {
  serviceId: string;
  variantId?: string | null;
  cityId?: string | null;
  serviceAreaId?: string | null;
}

export interface ResolvedPrice {
  amount: number;
  labourPrice: number;
  materialPrice: number;
  platformFee: number;
  taxRate: number;
  taxAmount: number;
  currency: string;
  priceType: string;
  isLocationSpecific: boolean;
  resolutionTier: 'SERVICE_AREA' | 'CITY' | 'GLOBAL_DEFAULT' | 'UNCONFIGURED';
}

export interface CatalogImportSource {
  id: string;
  source_file_name: string;
  source_type: string;
  import_batch_id: string;
  imported_at: string;
  source_hash?: string | null;
  status: string;
  created_at: string;
}

export interface CatalogImportRow {
  id: string;
  import_batch_id: string;
  source_row_number: number;
  raw_service: string;
  raw_subservice_name: string;
  raw_charge: string;
  raw_city: string;
  normalized_service_id?: string | null;
  mapping_status: string;
  mapping_notes?: string | null;
  needs_review: boolean;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data?: Record<string, any> | null;
  after_data?: Record<string, any> | null;
  created_at: string;
}

export interface ServiceZone {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  pincodes: string[];
  is_active: boolean;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  requestId: string;
  statusCode: number;
  details?: unknown;
  timestamp: string;
}

export * from './account.types';
export * from './routing.types';

// ==============================================================================
// PHASE 5: PRODUCTION SERVICEABILITY & AVAILABILITY ENGINE TYPES
// ==============================================================================

export type ServiceabilityReason =
  | 'SERVICE_AVAILABLE'
  | 'SERVICE_NOT_FOUND'
  | 'SERVICE_NOT_BOOKABLE'
  | 'CITY_NOT_SUPPORTED'
  | 'AREA_NOT_SUPPORTED'
  | 'OUTSIDE_SERVICE_RADIUS'
  | 'NO_PARTNER_CAPACITY'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'ADDRESS_NOT_FOUND'
  | 'ADDRESS_NOT_OWNED';

export interface ServiceabilityResult {
  serviceable: boolean;
  cityId?: string;
  cityName?: string;
  serviceAreaId?: string;
  serviceAreaName?: string;
  reason: ServiceabilityReason;
  message?: string;
  minNoticeMinutes?: number;
  deliveryTimeFormatted?: string;
}

export interface Professional {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  rating: number;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProfessionalSkill {
  id: string;
  professional_id: string;
  service_id: string;
  variant_id?: string | null;
  skill_level?: string | null;
  is_active: boolean;
}

export interface ProfessionalWorkingHours {
  id: string;
  professional_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // "09:00:00"
  end_time: string; // "18:00:00"
  is_active: boolean;
}

export interface ProfessionalTimeOff {
  id: string;
  professional_id: string;
  start_at: string;
  end_at: string;
  reason?: string | null;
  is_approved: boolean;
}

export interface BusinessHours {
  id: string;
  scope_type: 'GLOBAL' | 'CITY' | 'SERVICE_AREA' | 'SERVICE';
  scope_id?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface BusinessHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  scope_type: 'GLOBAL' | 'CITY' | 'SERVICE_AREA' | 'SERVICE';
  scope_id?: string | null;
  name: string;
  is_active: boolean;
}

export type SlotState = 'AVAILABLE' | 'SELECTED' | 'FULL' | 'EXPIRED' | 'UNAVAILABLE';

export interface TimeSlot {
  id: string; // Deterministic slot token / identifier e.g. "slot_2026-09-18_10:00"
  startAt: string; // ISO 8601 Timestamptz
  endAt: string; // ISO 8601 Timestamptz
  displayTime: string; // "10:00 AM – 11:00 AM"
  startTimeFormatted: string; // "10:00 AM"
  endTimeFormatted: string; // "11:00 AM"
  period: 'MORNING' | 'AFTERNOON' | 'EVENING';
  available: boolean;
  totalCapacity: number;
  bookedCapacity: number;
  remainingCapacity: number;
  state: SlotState;
}

export interface DateAvailability {
  date: string; // YYYY-MM-DD
  dayName: string; // "Mon", "Tue"
  dayNumber: number; // 18
  monthName: string; // "Sep"
  isToday: boolean;
  isTomorrow: boolean;
  isAvailable: boolean;
  reason?: string;
  availableSlotCount: number;
}

export interface AvailabilityResponse {
  serviceId: string;
  variantId?: string | null;
  serviceAreaId?: string;
  cityId?: string;
  timezone: string;
  date: string;
  serviceDurationMinutes: number;
  bufferMinutes: number;
  totalSlots: number;
  availableSlots: number;
  slots: TimeSlot[];
}

export type ReservationStatus = 'HELD' | 'CONFIRMED' | 'EXPIRED' | 'RELEASED';

export interface BookingReservation {
  id: string;
  booking_id?: string | null;
  user_id: string;
  service_id: string;
  variant_id?: string | null;
  professional_id?: string | null;
  service_area_id: string;
  start_at: string;
  end_at: string;
  expires_at: string;
  status: ReservationStatus;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityQueryParams {
  serviceId: string;
  variantId?: string | null;
  addressId?: string | null;
  serviceAreaId?: string | null;
  cityId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  date: string; // YYYY-MM-DD
}

export interface ReserveSlotParams {
  userId: string;
  serviceId: string;
  variantId?: string | null;
  serviceAreaId: string;
  startAt: string;
  endAt: string;
  idempotencyKey: string;
  holdDurationMinutes?: number;
}
