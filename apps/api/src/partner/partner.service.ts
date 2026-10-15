import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InMemoryFulfillmentRepository } from '../fulfillment/repositories/in-memory-fulfillment.repository';
import { AssignmentService } from '../fulfillment/services/assignment.service';
import { DispatchService } from '../fulfillment/services/dispatch.service';
import { BookingLifecycleService } from '../fulfillment/services/booking-lifecycle.service';
import { ExtensionService } from '../fulfillment/services/extension.service';

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(
    private readonly repository: InMemoryFulfillmentRepository,
    private readonly assignmentService: AssignmentService,
    private readonly dispatchService: DispatchService,
    private readonly lifecycleService: BookingLifecycleService,
    private readonly extensionService: ExtensionService
  ) {}

  /**
   * Update partner presence status (ONLINE, AVAILABLE, BUSY, PAUSED, OFFLINE)
   */
  public async updatePresenceStatus(
    partnerId: string,
    status: 'ONLINE' | 'AVAILABLE' | 'BUSY' | 'PAUSED' | 'OFFLINE',
    coordinates?: { latitude: number; longitude: number }
  ) {
    // Treat ONLINE and AVAILABLE as available in repository
    const repoStatus = (status === 'ONLINE' ? 'AVAILABLE' : status) as 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    await this.repository.updatePartnerPresence(partnerId, repoStatus, coordinates);
    const activeAssignment = await this.repository.getActiveAssignmentForPartner(partnerId);

    return {
      success: true,
      partnerId,
      status,
      activeJobId: activeAssignment?.bookingId || null,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get partner profile, capabilities, approval and vehicle info
   */
  public async getPartnerProfile(partnerId: string) {
    const candidate = await this.repository.getPartnerCandidate(partnerId);
    if (!candidate) {
      throw new NotFoundException(`Partner ${partnerId} not found`);
    }

    const activeAssignment = await this.repository.getActiveAssignmentForPartner(partnerId);

    return {
      partnerId: candidate.partnerId,
      fullName: candidate.fullName,
      phone: candidate.phone,
      isApproved: candidate.isApproved,
      isActive: candidate.isActive,
      status: candidate.status,
      capabilities: candidate.capabilities,
      vehicleType: candidate.vehicleType,
      rating: candidate.rating,
      completedJobCount: candidate.completedJobCount,
      acceptanceRate: candidate.acceptanceRate,
      activeJobId: activeAssignment?.bookingId || null,
      lastHeartbeatAt: candidate.lastHeartbeatAt,
    };
  }

  /**
   * Partner earnings breakdown
   */
  public async getEarnings(partnerId: string) {
    const candidate = await this.repository.getPartnerCandidate(partnerId);
    const completedCount = candidate?.completedJobCount || 0;
    const basePerJob = 140;

    return {
      partnerId,
      currency: 'INR',
      todayEarnings: 420,
      weekEarnings: 2940,
      totalEarnings: completedCount * basePerJob,
      completedJobs: completedCount,
      pendingSettlement: 420,
    };
  }

  /**
   * High frequency GPS heartbeat
   */
  public async recordHeartbeat(
    partnerId: string,
    heartbeat: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      accuracy?: number;
      recordedAt?: string;
    }
  ) {
    // 1. Validate coordinate boundaries (WGS84 standard)
    if (
      typeof heartbeat.latitude !== 'number' ||
      typeof heartbeat.longitude !== 'number' ||
      heartbeat.latitude < -90 ||
      heartbeat.latitude > 90 ||
      heartbeat.longitude < -180 ||
      heartbeat.longitude > 180
    ) {
      throw new BadRequestException('Invalid geographic coordinates supplied in heartbeat');
    }

    // 2. Teleportation and velocity plausibility filter (Max permissible urban speed: 120 km/h)
    const existing = await this.repository.getPartnerCandidate(partnerId);
    if (existing && existing.lastLatitude && existing.lastLongitude && existing.lastHeartbeatAt) {
      const elapsedSeconds = Math.max(1, (Date.now() - new Date(existing.lastHeartbeatAt).getTime()) / 1000);
      if (elapsedSeconds < 300) {
        // Haversine formula calculation
        const R = 6371; // Earth radius in km
        const dLat = ((heartbeat.latitude - existing.lastLatitude) * Math.PI) / 180;
        const dLon = ((heartbeat.longitude - existing.lastLongitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((existing.lastLatitude * Math.PI) / 180) *
            Math.cos((heartbeat.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const speedKmh = (distanceKm / elapsedSeconds) * 3600;

        // Only evaluate speed anomaly if distance moved exceeds 100 meters (GPS jitter threshold)
        if (distanceKm > 0.1 && speedKmh > 120) {
          this.logger.warn(
            `[GpsAnomaly] Rejected anomalous jump of ${distanceKm.toFixed(2)}km in ${elapsedSeconds.toFixed(1)}s (${speedKmh.toFixed(0)} km/h) for partner ${partnerId}`
          );
          throw new BadRequestException('GPS coordinate jump exceeds physical speed limits (teleportation guard)');
        }
      }
    }

    await this.repository.updatePartnerHeartbeat(partnerId, heartbeat);
    const activeAssignment = await this.repository.getActiveAssignmentForPartner(partnerId);

    return {
      acknowledged: true,
      serverTime: new Date().toISOString(),
      assignedJobId: activeAssignment?.bookingId || null,
    };
  }

  /**
   * Active offer inbox with remaining countdown
   */
  public async getActiveOffer(partnerId: string) {
    const offer = await this.repository.getActiveOfferForPartner(partnerId);
    if (!offer) {
      return { offer: null };
    }

    const remainingMs = Math.max(0, new Date(offer.expiresAt).getTime() - Date.now());

    return {
      offer: {
        offerId: offer.offerId,
        bookingId: offer.bookingId,
        serviceType: offer.serviceType,
        serviceTitle: offer.serviceTitle,
        durationMinutes: offer.durationMinutes,
        payoutAmount: offer.payoutAmount,
        currency: offer.currency,
        customerArea: offer.customerArea,
        distanceKm: offer.distanceKm,
        estimatedTravelMinutes: offer.estimatedTravelMinutes,
        expiresAt: offer.expiresAt,
        remainingSeconds: Math.ceil(remainingMs / 1000),
        requirements: offer.requirements,
      },
    };
  }

  /**
   * Atomically accept offer
   */
  public async acceptOffer(
    partnerId: string,
    offerId: string,
    currentLocation?: { latitude: number; longitude: number }
  ) {
    return this.assignmentService.acceptOffer(offerId, partnerId, currentLocation);
  }

  /**
   * Decline offer
   */
  public async declineOffer(partnerId: string, offerId: string, reason?: string) {
    await this.dispatchService.handleOfferDecline(offerId, reason || 'DECLINED_BY_PARTNER');
    return { acknowledged: true, offerStatus: 'REJECTED' };
  }

  /**
   * Job lifecycle: en route
   */
  public async markEnRoute(partnerId: string, jobId: string) {
    return this.lifecycleService.markEnRoute(jobId, partnerId);
  }

  /**
   * Job lifecycle: arrived
   */
  public async markArrived(
    partnerId: string,
    jobId: string,
    coords?: { latitude: number; longitude: number }
  ) {
    return this.lifecycleService.markArrived(jobId, partnerId, coords);
  }

  /**
   * Job lifecycle: start service
   */
  public async startService(partnerId: string, jobId: string, otp?: string) {
    return this.lifecycleService.startService(jobId, partnerId, otp);
  }

  /**
   * Job lifecycle: complete service
   */
  public async completeService(
    partnerId: string,
    jobId: string,
    notes?: string,
    actualWeightKg?: number
  ) {
    return this.lifecycleService.completeService(jobId, partnerId, notes, actualWeightKg);
  }

  /**
   * Extension response
   */
  public async respondToExtension(
    partnerId: string,
    jobId: string,
    extensionId: string,
    accepted: boolean
  ) {
    return this.extensionService.respondExtension(jobId, extensionId, partnerId, accepted);
  }
}
