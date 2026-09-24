/**
 * SERVENTICA — Fulfillment Domain Contracts & Transition Types (Phase 7)
 */

export type FulfillmentAction =
  | 'CONFIRM_BOOKING'
  | 'START_DISPATCH'
  | 'OFFER_PARTNER'
  | 'ACCEPT_OFFER'
  | 'START_EN_ROUTE'
  | 'MARK_ARRIVED'
  | 'START_SERVICE'
  | 'COMPLETE_SERVICE'
  | 'FINALIZE_SETTLEMENT'
  | 'REASSIGN_PARTNER'
  | 'CANCEL_BOOKING';

export type FulfillmentActorType =
  | 'CUSTOMER'
  | 'PARTNER'
  | 'SYSTEM'
  | 'ADMIN'
  | 'OPERATIONS';

export interface PricingSnapshot {
  baseAmount: number;
  itemTotal: number;
  platformFee: number;
  taxAmount: number;
  discountAmount: number;
  finalPayable: number;
  currency: string;
  pricingVersion: string;
  calculatedAt: string;
  breakdown: Record<string, any>;
}

export interface BookingSettlementRecord {
  id: string;
  booking_id: string;
  partner_id: string;
  gross_amount: number;
  platform_fee: number;
  tax_amount: number;
  partner_payout: number;
  currency: string;
  status: 'PENDING' | 'SETTLED' | 'DISPUTED' | 'REFUNDED';
  metadata: Record<string, any>;
  settled_at: string;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentTransitionResult {
  success: boolean;
  bookingId: string;
  previousStatus?: string;
  status: string;
  code?: string;
  error?: string;
  message?: string;
  settlement?: BookingSettlementRecord;
}

export interface ConfirmBookingParams {
  bookingId: string;
  bookingNumber?: string;
  customerId: string;
  addressId: string;
  serviceId: string;
  scheduledStart: string;
  subtotal: number;
  total: number;
  discount?: number;
  platformFee?: number;
  tax?: number;
  currency?: string;
  pricingSnapshot: PricingSnapshot;
  idempotencyKey?: string;
  items?: Array<{
    id?: string;
    serviceId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface ReassignPartnerParams {
  bookingId: string;
  reason: string;
  actorType: FulfillmentActorType;
  actorId: string;
}

export interface StartServiceParams {
  bookingId: string;
  partnerId: string;
  verificationOtp?: string;
}

export interface CompleteServiceParams {
  bookingId: string;
  partnerId: string;
  completionNotes?: string;
}

export interface CancelBookingFulfillmentParams {
  bookingId: string;
  reason: string;
  actorType: FulfillmentActorType;
  actorId: string;
}
