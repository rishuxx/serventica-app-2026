import { Injectable, Logger } from '@nestjs/common';
import {
  BookingAssignment,
  FulfillmentIntent,
  InstantBookingExtension,
  AssignmentStatus,
  ExtensionStatus,
} from '@serventica/types';
import {
  FulfillmentRepository,
  BookingRecord,
  DispatchOfferRecord,
} from './fulfillment.repository.interface';
import { PartnerCandidate } from '../specifications/partner-candidate.interface';

@Injectable()
export class InMemoryFulfillmentRepository implements FulfillmentRepository {
  private readonly logger = new Logger(InMemoryFulfillmentRepository.name);

  private readonly intents = new Map<string, FulfillmentIntent>();
  private readonly bookings = new Map<string, BookingRecord>();
  private readonly assignments = new Map<string, BookingAssignment>();
  private readonly partners = new Map<string, PartnerCandidate>();
  private readonly offers = new Map<string, DispatchOfferRecord>();
  private readonly extensions = new Map<string, InstantBookingExtension>();

  // Lock map to ensure atomic slot claim concurrency
  private readonly bookingLocks = new Map<string, Promise<any>>();

  constructor() {
    this.seedDefaultPartners();
  }

  private seedDefaultPartners() {
    // Seed 4 realistic partners near Dehradun (30.316494, 78.032191) with fresh heartbeats
    const now = new Date().toISOString();

    const p1: PartnerCandidate = {
      partnerId: 'prt_hh_01',
      userId: 'usr_p1',
      fullName: 'Vikram Singh',
      phone: '+919876500001',
      isApproved: true,
      isActive: true,
      status: 'AVAILABLE',
      capabilities: ['GENERAL_HELP', 'MOVING_ASSISTANCE'],
      vehicleType: 'BIKE',
      lastLatitude: 30.3182,
      lastLongitude: 78.0345,
      lastHeartbeatAt: now,
      currentActiveJobCount: 0,
      completedJobCount: 142,
      acceptanceRate: 0.96,
      rating: 4.9,
      hasConflictingFutureBooking: false,
    };

    const p2: PartnerCandidate = {
      partnerId: 'prt_rh_01',
      userId: 'usr_p2',
      fullName: 'Amit Rawat',
      phone: '+919876500002',
      isApproved: true,
      isActive: true,
      status: 'AVAILABLE',
      capabilities: ['ROADSIDE_ASSISTANCE', 'FUEL_TRANSPORT', 'FLAT_TYRE', 'BATTERY_START'],
      vehicleType: 'CAR',
      lastLatitude: 30.322,
      lastLongitude: 78.038,
      lastHeartbeatAt: now,
      currentActiveJobCount: 0,
      completedJobCount: 98,
      acceptanceRate: 0.92,
      rating: 4.8,
      hasConflictingFutureBooking: false,
    };

    const p3: PartnerCandidate = {
      partnerId: 'prt_lnd_01',
      userId: 'usr_p3',
      fullName: 'Deepak Joshi',
      phone: '+919876500003',
      isApproved: true,
      isActive: true,
      status: 'AVAILABLE',
      capabilities: ['LAUNDRY_PICKUP'],
      vehicleType: 'SCOOTER',
      lastLatitude: 30.314,
      lastLongitude: 78.029,
      lastHeartbeatAt: now,
      currentActiveJobCount: 0,
      completedJobCount: 215,
      acceptanceRate: 0.98,
      rating: 4.95,
      hasConflictingFutureBooking: false,
    };

    const p4: PartnerCandidate = {
      partnerId: 'prt_pm_02',
      userId: 'usr_p4',
      fullName: 'Suresh Negi',
      phone: '+919876500004',
      isApproved: true,
      isActive: true,
      status: 'AVAILABLE',
      capabilities: ['MOVING_ASSISTANCE', 'GENERAL_HELP'],
      vehicleType: 'TRUCK',
      lastLatitude: 30.326,
      lastLongitude: 78.041,
      lastHeartbeatAt: now,
      currentActiveJobCount: 0,
      completedJobCount: 76,
      acceptanceRate: 0.88,
      rating: 4.7,
      hasConflictingFutureBooking: false,
    };

    this.partners.set(p1.partnerId, p1);
    this.partners.set(p2.partnerId, p2);
    this.partners.set(p3.partnerId, p3);
    this.partners.set(p4.partnerId, p4);
  }

  // --- Intents ---
  async saveIntent(intent: FulfillmentIntent): Promise<FulfillmentIntent> {
    this.intents.set(intent.id, { ...intent, updatedAt: new Date().toISOString() });
    return this.intents.get(intent.id)!;
  }

  async getIntent(id: string): Promise<FulfillmentIntent | null> {
    return this.intents.get(id) || null;
  }

  async updateIntentStatus(id: string, status: FulfillmentIntent['status']): Promise<void> {
    const existing = this.intents.get(id);
    if (existing) {
      existing.status = status;
      existing.updatedAt = new Date().toISOString();
      this.intents.set(id, existing);
    }
  }

  // --- Bookings ---
  async saveBooking(booking: BookingRecord): Promise<BookingRecord> {
    this.bookings.set(booking.id, { ...booking, updated_at: new Date().toISOString() });
    return this.bookings.get(booking.id)!;
  }

  async getBooking(id: string): Promise<BookingRecord | null> {
    return this.bookings.get(id) || null;
  }

  async updateBookingStatus(id: string, status: string): Promise<void> {
    const existing = this.bookings.get(id);
    if (existing) {
      existing.status = status;
      existing.updated_at = new Date().toISOString();
      this.bookings.set(id, existing);
    }
  }

  // --- Assignments ---
  async saveAssignment(assignment: BookingAssignment): Promise<BookingAssignment> {
    this.assignments.set(assignment.id, { ...assignment });
    return this.assignments.get(assignment.id)!;
  }

  async getAssignment(id: string): Promise<BookingAssignment | null> {
    return this.assignments.get(id) || null;
  }

  async getAssignmentsForBooking(bookingId: string): Promise<BookingAssignment[]> {
    return Array.from(this.assignments.values()).filter((a) => a.bookingId === bookingId);
  }

  async getActiveAssignmentForPartner(partnerId: string): Promise<BookingAssignment | null> {
    return (
      Array.from(this.assignments.values()).find(
        (a) =>
          a.partnerId === partnerId &&
          !['COMPLETED', 'CANCELLED', 'DECLINED'].includes(a.assignmentStatus)
      ) || null
    );
  }

  async updateAssignmentStatus(
    id: string,
    status: AssignmentStatus,
    patch?: Partial<BookingAssignment>
  ): Promise<void> {
    const existing = this.assignments.get(id);
    if (existing) {
      const updated: BookingAssignment = {
        ...existing,
        ...patch,
        assignmentStatus: status,
      };
      this.assignments.set(id, updated);
    }
  }

  private readonly lockQueues = new Map<string, Promise<void>>();

  private async runWithLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.lockQueues.get(key) || Promise.resolve();
    let resolveLock!: () => void;
    const current = new Promise<void>((res) => {
      resolveLock = res;
    });
    this.lockQueues.set(key, current);

    await prev;
    try {
      return await fn();
    } finally {
      resolveLock();
      if (this.lockQueues.get(key) === current) {
        this.lockQueues.delete(key);
      }
    }
  }

  /**
   * Atomic slot reservation with mutex guarantee against race conditions.
   * If two partners accept simultaneously for requiredCount = 1, only ONE wins.
   */
  async atomicClaimSlot(
    bookingId: string,
    partnerId: string,
    requiredCount: number,
    payoutAmount: number
  ): Promise<{
    success: boolean;
    assignmentId?: string;
    isFullyAssigned: boolean;
    reason?: string;
  }> {
    return this.runWithLock(bookingId, async () => {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      return { success: false, isFullyAssigned: false, reason: 'Booking not found' };
    }

    const currentAssignments = await this.getAssignmentsForBooking(bookingId);
    const activeAssignments = currentAssignments.filter(
      (a) => !['CANCELLED', 'DECLINED'].includes(a.assignmentStatus)
    );

    // Check if partner is already assigned to this booking
    const alreadyAssigned = activeAssignments.some((a) => a.partnerId === partnerId);
    if (alreadyAssigned) {
      return { success: false, isFullyAssigned: true, reason: 'Partner already assigned to this job' };
    }

    // Check if all slots are filled
    if (activeAssignments.length >= requiredCount) {
      return {
        success: false,
        isFullyAssigned: true,
        reason: 'JOB_ALREADY_ASSIGNED',
      };
    }

    // Allocate new slot
    const assignmentId = `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const role = activeAssignments.length === 0 ? 'PRIMARY' : 'ASSISTANT';

    const newAssignment: BookingAssignment = {
      id: assignmentId,
      bookingId,
      partnerId,
      role,
      assignmentStatus: 'ACCEPTED',
      payoutAmount,
      currency: booking.currency || 'INR',
      assignedAt: new Date().toISOString(),
      acceptedAt: new Date().toISOString(),
    };

    this.assignments.set(assignmentId, newAssignment);

    // Update booking's assigned_partner_ids
    booking.assigned_partner_ids = [...(booking.assigned_partner_ids || []), partnerId];
    const isFullyAssigned = booking.assigned_partner_ids.length >= requiredCount;
    if (isFullyAssigned) {
      booking.status = 'PARTNER_ACCEPTED';
    }
    this.bookings.set(bookingId, booking);

    // Update partner status to BUSY
    const partner = this.partners.get(partnerId);
    if (partner) {
      partner.status = 'BUSY';
      partner.currentActiveJobCount += 1;
      this.partners.set(partnerId, partner);
    }

    return {
      success: true,
      assignmentId,
      isFullyAssigned,
    };
    });
  }

  // --- Partner Candidates & Presence ---
  async getPartnerCandidate(partnerId: string): Promise<PartnerCandidate | null> {
    return this.partners.get(partnerId) || null;
  }

  async getAllPartnerCandidates(): Promise<PartnerCandidate[]> {
    return Array.from(this.partners.values());
  }

  async updatePartnerPresence(
    partnerId: string,
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
    coords?: { latitude: number; longitude: number }
  ): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (partner) {
      partner.status = status;
      partner.lastHeartbeatAt = new Date().toISOString();
      if (coords) {
        partner.lastLatitude = coords.latitude;
        partner.lastLongitude = coords.longitude;
      }
      this.partners.set(partnerId, partner);
    }
  }

  async updatePartnerHeartbeat(
    partnerId: string,
    coords: { latitude: number; longitude: number; heading?: number; speed?: number; accuracy?: number }
  ): Promise<void> {
    const partner = this.partners.get(partnerId);
    if (partner) {
      partner.lastLatitude = coords.latitude;
      partner.lastLongitude = coords.longitude;
      partner.lastHeartbeatAt = new Date().toISOString();
      this.partners.set(partnerId, partner);
    }
  }

  // --- Dispatch Offers ---
  async saveOffer(offer: DispatchOfferRecord): Promise<DispatchOfferRecord> {
    this.offers.set(offer.offerId, { ...offer });
    return this.offers.get(offer.offerId)!;
  }

  async getOffer(offerId: string): Promise<DispatchOfferRecord | null> {
    return this.offers.get(offerId) || null;
  }

  async getActiveOfferForPartner(partnerId: string): Promise<DispatchOfferRecord | null> {
    const now = Date.now();
    return (
      Array.from(this.offers.values()).find((o) => {
        if (o.partnerId !== partnerId || o.status !== 'PENDING') return false;
        return new Date(o.expiresAt).getTime() > now;
      }) || null
    );
  }

  async getOffersForBooking(bookingId: string): Promise<DispatchOfferRecord[]> {
    return Array.from(this.offers.values()).filter((o) => o.bookingId === bookingId);
  }

  async updateOfferStatus(offerId: string, status: DispatchOfferRecord['status']): Promise<void> {
    const existing = this.offers.get(offerId);
    if (existing) {
      existing.status = status;
      this.offers.set(offerId, existing);
    }
  }

  // --- Extensions ---
  async saveExtension(extension: InstantBookingExtension): Promise<InstantBookingExtension> {
    this.extensions.set(extension.id, { ...extension });
    return this.extensions.get(extension.id)!;
  }

  async getExtension(id: string): Promise<InstantBookingExtension | null> {
    return this.extensions.get(id) || null;
  }

  async getPendingExtensionForBooking(bookingId: string): Promise<InstantBookingExtension | null> {
    return (
      Array.from(this.extensions.values()).find(
        (e) => e.bookingId === bookingId && e.status === 'REQUESTED'
      ) || null
    );
  }

  async updateExtensionStatus(id: string, status: ExtensionStatus): Promise<void> {
    const existing = this.extensions.get(id);
    if (existing) {
      existing.status = status;
      existing.respondedAt = new Date().toISOString();
      this.extensions.set(id, existing);
    }
  }

  // --- Admin & Operations Support ---
  private readonly auditLogs: Array<any> = [];

  async getAllBookings(): Promise<BookingRecord[]> {
    return Array.from(this.bookings.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async updatePartnerCapabilities(partnerId: string, capabilities: any[]): Promise<PartnerCandidate | null> {
    const partner = this.partners.get(partnerId);
    if (partner) {
      partner.capabilities = capabilities;
      this.partners.set(partnerId, partner);
      return partner;
    }
    return null;
  }

  async saveAuditLog(log: any): Promise<void> {
    this.auditLogs.unshift({
      ...log,
      id: log.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: log.timestamp || new Date().toISOString(),
    });
  }

  async getAuditLogs(limit = 100): Promise<any[]> {
    return this.auditLogs.slice(0, limit);
  }
}

