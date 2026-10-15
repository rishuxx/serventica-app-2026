import {
  BookingAssignment,
  FulfillmentIntent,
  InstantBookingExtension,
  AssignmentStatus,
  ExtensionStatus,
} from '@serventica/types';
import { PartnerCandidate } from '../specifications/partner-candidate.interface';

export interface DispatchOfferRecord {
  offerId: string;
  bookingId: string;
  partnerId: string;
  waveNumber: number;
  serviceType: string;
  serviceTitle: string;
  durationMinutes: number;
  payoutAmount: number;
  currency: string;
  customerArea: string;
  customerCoordinates: { latitude: number; longitude: number };
  distanceKm: number;
  estimatedTravelMinutes: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  requirements: Record<string, any>;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  booking_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  service_id: string;
  fulfillment_mode: 'INSTANT' | 'SCHEDULED';
  status: string;
  subtotal: number;
  total: number;
  currency: string;
  address_id: string;
  address_line?: string;
  latitude: number;
  longitude: number;
  pricing_snapshot: any;
  service_requirement_id?: string;
  service_requirement?: Record<string, any>;
  assigned_partner_ids: string[];
  required_partner_count: number;
  verification_otp?: string;
  service_started_at?: string;
  service_completed_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentRepository {
  // Intents
  saveIntent(intent: FulfillmentIntent): Promise<FulfillmentIntent>;
  getIntent(id: string): Promise<FulfillmentIntent | null>;
  updateIntentStatus(id: string, status: FulfillmentIntent['status']): Promise<void>;

  // Bookings
  saveBooking(booking: BookingRecord): Promise<BookingRecord>;
  getBooking(id: string): Promise<BookingRecord | null>;
  updateBookingStatus(id: string, status: string): Promise<void>;

  // Assignments
  saveAssignment(assignment: BookingAssignment): Promise<BookingAssignment>;
  getAssignment(id: string): Promise<BookingAssignment | null>;
  getAssignmentsForBooking(bookingId: string): Promise<BookingAssignment[]>;
  getActiveAssignmentForPartner(partnerId: string): Promise<BookingAssignment | null>;
  updateAssignmentStatus(
    id: string,
    status: AssignmentStatus,
    patch?: Partial<BookingAssignment>
  ): Promise<void>;
  atomicClaimSlot(
    bookingId: string,
    partnerId: string,
    requiredCount: number,
    payoutAmount: number
  ): Promise<{ success: boolean; assignmentId?: string; isFullyAssigned: boolean; reason?: string }>;

  // Partner Candidates & Presence
  getPartnerCandidate(partnerId: string): Promise<PartnerCandidate | null>;
  getAllPartnerCandidates(): Promise<PartnerCandidate[]>;
  updatePartnerPresence(
    partnerId: string,
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
    coords?: { latitude: number; longitude: number }
  ): Promise<void>;
  updatePartnerHeartbeat(
    partnerId: string,
    coords: { latitude: number; longitude: number; heading?: number; speed?: number; accuracy?: number }
  ): Promise<void>;

  // Dispatch Offers
  saveOffer(offer: DispatchOfferRecord): Promise<DispatchOfferRecord>;
  getOffer(offerId: string): Promise<DispatchOfferRecord | null>;
  getActiveOfferForPartner(partnerId: string): Promise<DispatchOfferRecord | null>;
  getOffersForBooking(bookingId: string): Promise<DispatchOfferRecord[]>;
  updateOfferStatus(offerId: string, status: DispatchOfferRecord['status']): Promise<void>;

  // Extensions
  saveExtension(extension: InstantBookingExtension): Promise<InstantBookingExtension>;
  getExtension(id: string): Promise<InstantBookingExtension | null>;
  getPendingExtensionForBooking(bookingId: string): Promise<InstantBookingExtension | null>;
  updateExtensionStatus(id: string, status: ExtensionStatus): Promise<void>;
}
