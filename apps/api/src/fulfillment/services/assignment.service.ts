import { Injectable, Logger, ConflictException, BadRequestException, Optional } from '@nestjs/common';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { DispatchService } from './dispatch.service';
import { FulfillmentOutboxService } from '../fulfillment-outbox.service';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { MatchedPartnerPayload } from '@serventica/types';

export interface AcceptanceResult {
  success: boolean;
  bookingId: string;
  assignmentId: string;
  isFullyAssigned: boolean;
  assignedPartnerCount: number;
  requiredPartnerCount: number;
  customer: {
    name: string;
    addressLine: string;
    latitude: number;
    longitude: number;
    maskedContact: string;
  };
  jobTimeline: {
    assignedAt: string;
    targetArrivalAt: string;
  };
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly repository: InMemoryFulfillmentRepository,
    private readonly dispatchService: DispatchService,
    private readonly outboxService: FulfillmentOutboxService,
    @Optional() private readonly trackingGateway?: TrackingGateway
  ) {}

  /**
   * Atomically accepts an offer with mutex protection against race conditions.
   * If two partners accept simultaneously for a single slot, only one wins.
   */
  public async acceptOffer(
    offerId: string,
    partnerId: string,
    currentLocation?: { latitude: number; longitude: number }
  ): Promise<AcceptanceResult> {
    const offer = await this.repository.getOffer(offerId);
    if (!offer) {
      throw new BadRequestException('Offer not found');
    }

    if (offer.status !== 'PENDING') {
      throw new ConflictException(`Offer is no longer active (status: ${offer.status})`);
    }

    const expiryTime = new Date(offer.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      await this.repository.updateOfferStatus(offerId, 'EXPIRED');
      throw new ConflictException('Offer has expired');
    }

    const booking = await this.repository.getBooking(offer.bookingId);
    if (!booking) {
      throw new BadRequestException('Associated booking not found');
    }

    // Atomic slot claim
    const requiredCount = booking.required_partner_count || 1;
    const claimResult = await this.repository.atomicClaimSlot(
      booking.id,
      partnerId,
      requiredCount,
      offer.payoutAmount
    );

    if (!claimResult.success) {
      await this.repository.updateOfferStatus(offerId, 'EXPIRED');
      throw new ConflictException(claimResult.reason || 'JOB_ALREADY_ASSIGNED');
    }

    // Mark offer as accepted
    await this.repository.updateOfferStatus(offerId, 'ACCEPTED');

    if (currentLocation) {
      await this.repository.updatePartnerPresence(partnerId, 'BUSY', currentLocation);
    }

    if (claimResult.isFullyAssigned) {
      this.dispatchService.markBookingFulfilled(booking.id);
      await this.repository.updateBookingStatus(booking.id, 'PARTNER_ACCEPTED');

      // Phase 3: Real-Time Broadcast to customer's tracking room: tracking:{bookingId}
      const partner = await this.repository.getPartnerCandidate(partnerId);
      const targetArrivalIso = new Date(Date.now() + (offer.estimatedTravelMinutes || 15) * 60 * 1000).toISOString();
      const matchPayload: MatchedPartnerPayload = {
        bookingId: booking.id,
        status: 'PARTNER_ACCEPTED',
        partner: {
          id: partnerId,
          name: partner?.fullName || 'Verified Partner',
          phone: partner?.phone || '+91-9876543210',
          rating: partner?.rating || 4.9,
          vehicleType: partner?.vehicleType,
          location:
            currentLocation ||
            (partner
              ? { latitude: partner.lastLatitude, longitude: partner.lastLongitude }
              : { latitude: booking.latitude, longitude: booking.longitude }),
        },
        targetArrivalAt: targetArrivalIso,
        estimatedArrivalMinutes: offer.estimatedTravelMinutes || 15,
      };
      this.trackingGateway?.broadcastMatchToBooking(booking.id, matchPayload);

      // Enqueue outbox event
      this.outboxService.enqueueEvent({
        id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        booking_id: booking.id,
        event_type: 'PARTNER_ASSIGNED',
        payload: {
          booking_id: booking.id,
          partner_id: partnerId,
          assigned_count: booking.assigned_partner_ids.length,
          required_count: requiredCount,
        },
      });
    }

    const now = new Date();
    const targetArrival = new Date(now.getTime() + (offer.estimatedTravelMinutes || 15) * 60 * 1000);

    return {
      success: true,
      bookingId: booking.id,
      assignmentId: claimResult.assignmentId!,
      isFullyAssigned: claimResult.isFullyAssigned,
      assignedPartnerCount: booking.assigned_partner_ids.length,
      requiredPartnerCount: requiredCount,
      customer: {
        name: booking.customer_name || 'Serventica Customer',
        addressLine: booking.address_line || 'Customer Location',
        latitude: booking.latitude,
        longitude: booking.longitude,
        maskedContact: '+91-XXXXX' + (booking.customer_phone?.slice(-4) || '1234'),
      },
      jobTimeline: {
        assignedAt: now.toISOString(),
        targetArrivalAt: targetArrival.toISOString(),
      },
    };
  }
}
