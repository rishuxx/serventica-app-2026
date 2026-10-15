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

// ==============================================================================
// SERVENTICA INSTANT PLATFORM CONTRACTS & DOMAIN MODELS
// ==============================================================================

export type FulfillmentMode = 'INSTANT' | 'SCHEDULED';

export type InstantServiceType =
  | 'HELPING_HAND'
  | 'ROAD_HELP'
  | 'LAUNDRY'
  | 'PACK_MOVE';

export type FulfillmentIntentStatus =
  | 'CREATED'
  | 'QUOTED'
  | 'MATCHING'
  | 'CONFIRMED'
  | 'UNFULFILLABLE'
  | 'CANCELLED'
  | 'EXPIRED';

export interface FulfillmentIntent {
  id: string;
  customerId: string;
  serviceId: string;
  instantServiceType: InstantServiceType;
  fulfillmentMode: FulfillmentMode;
  serviceRequirementId: string;
  addressId: string;
  pickupCoordinates: {
    latitude: number;
    longitude: number;
  };
  status: FulfillmentIntentStatus;
  quoteId?: string | null;
  idempotencyKey?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentRole = 'PRIMARY' | 'ASSISTANT' | 'SPECIALIST';

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BookingAssignment {
  id: string;
  bookingId: string;
  partnerId: string;
  role: AssignmentRole;
  assignmentStatus: AssignmentStatus;
  payoutAmount: number;
  currency: string;
  assignedAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  metadata?: Record<string, any>;
}

export type PartnerCapabilityCode =
  | 'GENERAL_HELP'
  | 'ROADSIDE_ASSISTANCE'
  | 'FUEL_TRANSPORT'
  | 'FLAT_TYRE'
  | 'BATTERY_START'
  | 'LAUNDRY_PICKUP'
  | 'MOVING_ASSISTANCE';

export interface PartnerCapability {
  id: string;
  partnerId: string;
  capabilityCode: PartnerCapabilityCode;
  isActive: boolean;
  verifiedAt: string;
}

export interface ServiceRequirement {
  id: string;
  instantServiceType: InstantServiceType;
  requiredPartnerCount: number;
  durationMinutes: number;
  taskCategory?: string;
  vehicleType?: 'BIKE' | 'SCOOTER' | 'CAR' | 'SUV' | 'OTHER';
  starterStatus?: 'YES' | 'NO' | 'NOT_SURE';
  issueType?: 'FUEL' | 'BREAKDOWN' | 'FLAT_TYRE' | 'BATTERY' | 'OTHER';
  fuelType?: 'PETROL' | 'DIESEL';
  fuelQuantityLitres?: number;
  approxLoadKg?: number;
  actualVerifiedWeightKg?: number;
  specialInstructions?: string;
  createdAt: string;
}

export type ExtensionStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface InstantBookingExtension {
  id: string;
  bookingId: string;
  additionalMinutes: number;
  quoteId?: string | null;
  status: ExtensionStatus;
  requestedAt: string;
  expiresAt?: string;
  respondedAt?: string | null;
  conflictChecked: boolean;
}

export interface InstantServicePolicy {
  serviceId: string;
  instantEnabled: boolean;
  scheduledEnabled: boolean;
  maxRadiusKm: number;
  minNoticeMinutes: number;
  maxInitialDurationMinutes: number;
  allowExtensions: boolean;
  extensionSlotMinutes: number;
  fuelMaxLitres: number;
  prohibitedTaskCodes: string[];
}

export interface CalculateInstantQuoteParams {
  serviceSlug: string;
  latitude: number;
  longitude: number;
  requirements: {
    durationMinutes: number;
    requiredPartnerCount?: number;
    taskCategory?: string;
    vehicleType?: 'BIKE' | 'SCOOTER' | 'CAR' | 'SUV' | 'OTHER';
    issueType?: 'FUEL' | 'BREAKDOWN' | 'FLAT_TYRE' | 'BATTERY' | 'OTHER';
    fuelType?: 'PETROL' | 'DIESEL';
    fuelQuantityLitres?: number;
    approxLoadKg?: number;
  };
}

export interface CreateInstantDispatchParams {
  quoteId: string;
  addressId: string;
  serviceSlug: string;
  requirements: {
    durationMinutes: number;
    requiredPartnerCount?: number;
    taskCategory?: string;
    vehicleType?: 'BIKE' | 'SCOOTER' | 'CAR' | 'SUV' | 'OTHER';
    starterStatus?: 'YES' | 'NO' | 'NOT_SURE';
    issueType?: 'FUEL' | 'BREAKDOWN' | 'FLAT_TYRE' | 'BATTERY' | 'OTHER';
    fuelType?: 'PETROL' | 'DIESEL';
    fuelQuantityLitres?: number;
    approxLoadKg?: number;
    specialInstructions?: string;
  };
  paymentMethod: string;
  idempotencyKey?: string;
}

export interface RequestExtensionParams {
  bookingId: string;
  additionalMinutes: number;
}

export interface RespondExtensionParams {
  bookingId: string;
  extensionId: string;
  accepted: boolean;
}

// ==============================================================================
// PHASE 3: REAL-TIME WEBSOCKET & SOCKET.IO DISPATCH EVENT CONTRACTS
// ==============================================================================

export interface DispatchOfferPayload {
  offerId: string;
  bookingId: string;
  serviceType: string;
  serviceTitle: string;
  durationMinutes: number;
  payoutAmount: number;
  currency: string;
  customerArea: string;
  distanceKm: number;
  estimatedTravelMinutes: number;
  expiresAt: string;
  remainingSeconds: number;
  requirements: Record<string, any>;
}

export interface MatchedPartnerPayload {
  bookingId: string;
  status: 'PARTNER_ACCEPTED';
  partner: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicleType?: string;
    specialization?: string;
    avatarUrl?: string;
    vehicleDetails?: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  targetArrivalAt: string;
  estimatedArrivalMinutes: number;
}

export interface InstantSocketEvents {
  // Partner Private Room (partner:{partnerId})
  'dispatch:new_offer': DispatchOfferPayload;
  'dispatch:offer_cancelled': { offerId: string; reason: string };
  'job:extension_prompt': {
    bookingId: string;
    extensionId: string;
    additionalMinutes: number;
    additionalPayout: number;
    expiresAt: string;
  };

  // Tracking Room (tracking:{bookingId})
  'dispatch:matched': MatchedPartnerPayload;
  'partner:arrived': {
    bookingId: string;
    arrivedAt: string;
    verificationOtp?: string;
  };
  'job:started': {
    bookingId: string;
    startedAt: string;
  };
  'job:extension_confirmed': {
    bookingId: string;
    extensionId: string;
    newDurationMinutes: number;
    newTotal: number;
  };
  'job:laundry_weight_confirmation': {
    bookingId: string;
    initialTotal: number;
    reconciledTotal: number;
    deviationPercent: number;
    requiresCustomerConfirmation: boolean;
  };
  'job:completed': {
    bookingId: string;
    completedAt: string;
    total: number;
  };
  'job:redispatching': {
    bookingId: string;
    message: string;
  };
  'job:cancelled': {
    bookingId: string;
    reason: string;
  };
}

// ==============================================================================
// PHASE 4: ADMIN, OPERATIONS & AUDIT TYPES
// ==============================================================================

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATIONS' | 'SUPPORT';

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorRole: AdminRole;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  ipAddress?: string;
}

export interface AdminInstantStats {
  activeRequests: number;
  matching: number;
  assigned: number;
  enRoute: number;
  inProgress: number;
  completed: number;
  unfulfilled: number;
  cancelled: number;
  activeOnlinePartners: number;
  avgMatchingSeconds: number;
  avgArrivalMinutes: number;
}

export interface AdminManualReassignParams {
  bookingId: string;
  newPartnerId: string;
  reason: string;
  adminId: string;
}

export interface AdminServiceConfigUpdateParams {
  serviceId: string;
  instantEnabled?: boolean;
  maxRadiusKm?: number;
  maxInitialDurationMinutes?: number;
  allowExtensions?: boolean;
  fuelMaxLitres?: number;
  adminId: string;
}



