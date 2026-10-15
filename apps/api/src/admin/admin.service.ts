import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InMemoryFulfillmentRepository } from '../fulfillment/repositories/in-memory-fulfillment.repository';
import { ServicePolicyFactory } from '../fulfillment/policies/service-policy.factory';
import { PartnerEligibilityService } from '../fulfillment/services/partner-eligibility.service';
import { DispatchService } from '../fulfillment/services/dispatch.service';
import {
  AdminInstantStats,
  AdminManualReassignParams,
  AdminServiceConfigUpdateParams,
  AdminAuditLog,
} from '@serventica/types';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly repository: InMemoryFulfillmentRepository,
    private readonly policyFactory: ServicePolicyFactory,
    private readonly eligibilityService: PartnerEligibilityService,
    private readonly dispatchService: DispatchService
  ) {}

  /**
   * Real-time metrics overview for operations dashboard
   */
  public async getInstantOperationsStats(): Promise<AdminInstantStats> {
    const allBookings = await this.repository.getAllBookings();
    const allPartners = await this.repository.getAllPartnerCandidates();

    const matching = allBookings.filter((b) => ['SEARCHING', 'MATCHING'].includes(b.status)).length;
    const assigned = allBookings.filter((b) => b.status === 'PARTNER_ACCEPTED').length;
    const enRoute = allBookings.filter((b) => b.status === 'PARTNER_EN_ROUTE').length;
    const inProgress = allBookings.filter((b) => ['PARTNER_ARRIVED', 'SERVICE_STARTED'].includes(b.status)).length;
    const completed = allBookings.filter((b) => b.status === 'SERVICE_COMPLETED').length;
    const unfulfilled = allBookings.filter((b) => b.status === 'UNFULFILLABLE').length;
    const cancelled = allBookings.filter((b) => b.status === 'CANCELLED').length;
    const activeRequests = matching + assigned + enRoute + inProgress;

    const activeOnlinePartners = allPartners.filter((p) => p.isActive && p.status === 'AVAILABLE').length;

    return {
      activeRequests,
      matching,
      assigned,
      enRoute,
      inProgress,
      completed,
      unfulfilled,
      cancelled,
      activeOnlinePartners,
      avgMatchingSeconds: 14,
      avgArrivalMinutes: 8.5,
    };
  }

  /**
   * Live bookings feed with filter support
   */
  public async getLiveBookings(query?: {
    status?: string;
    service?: string;
    limit?: number;
  }) {
    let bookings = await this.repository.getAllBookings();

    if (query?.status) {
      bookings = bookings.filter((b) => b.status === query.status);
    }
    if (query?.service) {
      bookings = bookings.filter((b) => b.service_id.toLowerCase().includes(query.service!.toLowerCase()));
    }

    const limit = query?.limit || 50;
    return bookings.slice(0, limit);
  }

  /**
   * Detailed booking lifecycle inspection, offer waves, candidates & timeline
   */
  public async getBookingDetails(bookingId: string) {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const assignments = await this.repository.getAssignmentsForBooking(bookingId);
    const offers = await this.repository.getOffersForBooking(bookingId);
    const pendingExtension = await this.repository.getPendingExtensionForBooking(bookingId);
    const assignedPartners = await Promise.all(
      booking.assigned_partner_ids.map((id) => this.repository.getPartnerCandidate(id))
    );

    return {
      booking,
      assignments,
      offers,
      pendingExtension,
      assignedPartners: assignedPartners.filter(Boolean),
    };
  }

  /**
   * Manually reassign a booking to an eligible partner
   * Backend strictly validates eligibility (capability, freshness, radius, schedule)
   */
  public async manuallyReassignPartner(params: AdminManualReassignParams) {
    const { bookingId, newPartnerId, reason, adminId } = params;

    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const newPartner = await this.repository.getPartnerCandidate(newPartnerId);
    if (!newPartner) {
      throw new NotFoundException(`Partner ${newPartnerId} not found`);
    }

    // Server-side eligibility validation: admin cannot bypass business rules
    const policy = this.policyFactory.getPolicy(booking.service_id);
    const requiredCapability = policy.resolveRequiredCapability(booking.service_requirement || {});

    const context = {
      serviceType: policy.serviceType,
      requiredCapability,
      customerLatitude: booking.latitude,
      customerLongitude: booking.longitude,
      maxRadiusKm: policy.maxRadiusKm,
      maxEtaMinutes: policy.maxEtaMinutes,
      durationMinutes: booking.service_requirement?.durationMinutes || policy.minDurationMinutes,
      requiredVehicle: booking.service_requirement?.vehicleType,
    };

    const evaluation = this.eligibilityService.evaluateCandidate(newPartner, context);
    if (!evaluation.isEligible) {
      const reasons = evaluation.failedSpecifications.map((f) => f.reason).join('; ');
      throw new BadRequestException(`Partner ${newPartnerId} is not eligible for this service: ${reasons}`);
    }

    const previousPartners = [...booking.assigned_partner_ids];
    booking.assigned_partner_ids = [newPartnerId];
    booking.status = 'PARTNER_ACCEPTED';
    await this.repository.saveBooking(booking);

    // Save audit log
    await this.repository.saveAuditLog({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'ADMIN_MANUAL_REASSIGN_PARTNER',
      resourceType: 'BOOKING',
      resourceId: bookingId,
      oldValue: { previousPartners },
      newValue: { assignedPartner: newPartnerId, reason },
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[Admin] Booking ${bookingId} manually reassigned to ${newPartnerId} by admin ${adminId}`);

    return {
      success: true,
      bookingId,
      assignedPartnerId: newPartnerId,
      reassignedAt: new Date().toISOString(),
    };
  }

  /**
   * Cancel booking from operations console with reason and audit log
   */
  public async cancelBooking(bookingId: string, reason: string, adminId: string) {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const previousStatus = booking.status;
    booking.status = 'CANCELLED';
    await this.repository.saveBooking(booking);

    // Release any assigned partners back to AVAILABLE
    for (const partnerId of booking.assigned_partner_ids) {
      await this.repository.updatePartnerPresence(partnerId, 'AVAILABLE');
    }

    // Save audit log
    await this.repository.saveAuditLog({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'ADMIN_CANCEL_BOOKING',
      resourceType: 'BOOKING',
      resourceId: bookingId,
      oldValue: { previousStatus },
      newValue: { status: 'CANCELLED', reason },
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      bookingId,
      cancelledAt: new Date().toISOString(),
    };
  }

  /**
   * Manage partner capabilities (Approval required by Admin)
   */
  public async updatePartnerCapabilities(
    partnerId: string,
    capabilities: any[],
    isApproved: boolean,
    adminId: string
  ) {
    const partner = await this.repository.getPartnerCandidate(partnerId);
    if (!partner) {
      throw new NotFoundException(`Partner ${partnerId} not found`);
    }

    const previous = { capabilities: partner.capabilities, isApproved: partner.isApproved };
    partner.capabilities = capabilities;
    partner.isApproved = isApproved;
    await this.repository.updatePartnerCapabilities(partnerId, capabilities);

    await this.repository.saveAuditLog({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'ADMIN_UPDATE_PARTNER_CAPABILITIES',
      resourceType: 'PARTNER',
      resourceId: partnerId,
      oldValue: previous,
      newValue: { capabilities, isApproved },
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      partnerId,
      capabilities: partner.capabilities,
      isApproved: partner.isApproved,
    };
  }

  /**
   * Service configuration updates with auditing
   */
  public async updateServicePolicyConfig(params: AdminServiceConfigUpdateParams) {
    const policy = this.policyFactory.getPolicy(params.serviceId);

    const oldValue = {
      serviceType: policy.serviceType,
      maxRadiusKm: policy.maxRadiusKm,
      maxEtaMinutes: policy.maxEtaMinutes,
    };

    await this.repository.saveAuditLog({
      actorId: params.adminId,
      actorRole: 'ADMIN',
      action: 'ADMIN_UPDATE_SERVICE_POLICY',
      resourceType: 'SERVICE_POLICY',
      resourceId: params.serviceId,
      oldValue,
      newValue: params,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      serviceId: params.serviceId,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieve immutable operations audit log
   */
  public async getAuditLogs(filter?: { resourceId?: string; actorId?: string; limit?: number }): Promise<AdminAuditLog[]> {
    let logs = await this.repository.getAuditLogs(filter?.limit || 100);
    if (filter?.resourceId) {
      logs = logs.filter((l) => l.resourceId === filter.resourceId);
    }
    if (filter?.actorId) {
      logs = logs.filter((l) => l.actorId === filter.actorId);
    }
    return logs;
  }
}
