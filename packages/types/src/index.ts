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
  slug: string;
  description?: string | null;
  icon?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  parent_id?: string | null;
}

export interface ServiceItem {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  pricing_type: ServicePricingType;
  rating: number;
  reviews_count: number;
  is_active: boolean;
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
