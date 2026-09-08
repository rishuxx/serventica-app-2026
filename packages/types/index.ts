/**
 * SERVENTICA — Canonical Data Contracts & Entities
 */

export type UserRole = 
  | 'CUSTOMER'
  | 'PARTNER'
  | 'SUPPORT_AGENT'
  | 'OPERATIONS_AGENT'
  | 'ADMIN'
  | 'SUPER_ADMIN';

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
  | 'CANCELLED_BY_SYSTEM';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
}

export interface ServiceItem {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  duration_minutes: number;
  pricing_type: 'FIXED' | 'VARIANT' | 'ADDON' | 'QUANTITY' | 'HOURLY';
  rating: number;
  reviews_count: number;
  is_active: boolean;
}

export interface ServiceZone {
  id: string;
  name: string;
  city: string;
  state: string;
  is_active: boolean;
}
