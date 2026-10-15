/**
 * SERVENTICA — Instant Platform Types (Customer Production Experience)
 * Phase 4: Production Instant Experience Contracts
 */

import { InstantServiceType, MatchedPartnerPayload, PartnerLiveLocation } from '@serventica/types';

export type InstantStep =
  | 'HUB'
  | 'CONFIG'
  | 'REVIEW'
  | 'MATCHING'
  | 'ACTIVE'
  | 'COMPLETED';

export interface InstantServiceCatalogItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  startingPrice: number;
  estimatedArrivalMinutes: number | null;
  instantEnabled: boolean;
  themeColor: string;
  badge: string;
  icon: string;
  description: string;
  availableCapacity?: number;
}

export type HelpingHandTask =
  | 'Cleaning'
  | 'Dishwashing'
  | 'Cooking assistance'
  | 'Packing'
  | 'Moving items'
  | 'Organizing'
  | 'Other';

export interface HelpingHandConfig {
  selectedTasks: HelpingHandTask[];
  durationMinutes: number;
  customTaskNote: string;
}

export type RoadHelpSubservice =
  | 'FUEL'
  | 'BREAKDOWN'
  | 'FLAT_TYRE'
  | 'BATTERY'
  | 'OTHER';

export type FuelType = 'PETROL' | 'DIESEL';

export type VehicleType = 'BIKE' | 'SCOOTER' | 'CAR' | 'SUV' | 'OTHER';

export type BreakdownIssue =
  | 'Cannot start'
  | 'Flat tyre'
  | 'Battery issue'
  | 'Engine issue'
  | 'Overheating'
  | 'Other';

export interface RoadHelpConfig {
  subservice: RoadHelpSubservice;
  fuelType: FuelType;
  fuelLitres: number;
  vehicleType: VehicleType;
  breakdownIssue: BreakdownIssue;
  issueDescription: string;
}

export type LaundryLoadOption = 'LIGHT' | 'MEDIUM' | 'HEAVY';

export interface LaundryConfig {
  approxLoadKg: number;
  loadLabel: string;
  clothingTypes: string[];
  specialInstructions: string;
}

export type PackMoveNeed =
  | 'Packing'
  | 'Loading'
  | 'Unloading'
  | 'Moving'
  | 'Rearranging';

export interface PackMoveConfig {
  needs: PackMoveNeed[];
  helperCount: number;
  durationMinutes: number;
  specialInstructions: string;
}

export interface InstantQuoteLineItem {
  description: string;
  amount: number;
}

export interface InstantQuote {
  quoteId: string;
  subtotal: number;
  tax: number;
  discount: number;
  totalPayable: number;
  currency: string;
  estimatedArrivalMinutes: number | null;
  lineItems: InstantQuoteLineItem[];
  expiresAt: string;
}

export type MatchingState =
  | 'SEARCHING'
  | 'FOUND'
  | 'UNAVAILABLE'
  | 'RETRYING';

export interface InstantActiveBooking {
  bookingId: string;
  bookingNumber?: string;
  serviceSlug: string;
  serviceTitle: string;
  status: string;
  addressLine: string;
  totalPayable: number;
  currency: string;
  verificationOtp?: string;
  assignedPartner?: MatchedPartnerPayload | null;
  liveLocation?: PartnerLiveLocation | null;
  serviceStartedAt?: string | null;
  scheduledEndAt?: string | null;
  canExtend?: boolean;
  createdAt?: string;
  customerId?: string;
}

export interface InstantErrorState {
  code: string;
  title: string;
  message: string;
  canRetry: boolean;
  recommendedAction?: 'RETRY' | 'SCHEDULE' | 'CHANGE_SERVICE' | 'DISMISS';
}
