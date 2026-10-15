import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { DispatchService } from './dispatch.service';
import { FulfillmentOutboxService } from '../fulfillment-outbox.service';
import { TrackingGateway } from '../../tracking/tracking.gateway';

export interface CancellationResult {
  success: boolean;
  bookingId: string;
  previousStatus: string;
  status: string;
  cancellationFee: number;
  redispatchAttempted: boolean;
  reason: string;
}

@Injectable()
export class CancellationService {
  private readonly logger = new Logger(CancellationService.name);

  constructor(
    private readonly repository: InMemoryFulfillmentRepository,
    private readonly dispatchService: DispatchService,
    private readonly outboxService: FulfillmentOutboxService,
    @Optional() private readonly trackingGateway?: TrackingGateway
  ) {}

  /**
   * Customer cancels an instant booking
   */
  public async cancelByCustomer(
    bookingId: string,
    customerId: string,
    reason: string
  ): Promise<CancellationResult> {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (booking.customer_id !== customerId) {
      throw new BadRequestException('Unauthorized: You are not the customer of this booking');
    }

    if (['SERVICE_COMPLETED', 'CLOSED'].includes(booking.status)) {
      throw new ConflictException('Cannot cancel a completed service');
    }

    if (booking.status === 'SERVICE_STARTED') {
      throw new ConflictException(
        'Service is already in progress. Please contact customer support to terminate active service.'
      );
    }

    let cancellationFee = 0;
    if (['PARTNER_EN_ROUTE', 'PARTNER_ARRIVED'].includes(booking.status)) {
      cancellationFee = 50.0; // Minimal compensation for partner travel
    }

    const previousStatus = booking.status;
    booking.status = 'CANCELLED_BY_CUSTOMER';
    booking.cancellation_reason = reason;
    await this.repository.saveBooking(booking);

    // Release all assigned partners
    for (const partnerId of booking.assigned_partner_ids || []) {
      await this.repository.updatePartnerPresence(partnerId, 'AVAILABLE');
      const partner = await this.repository.getPartnerCandidate(partnerId);
      if (partner) {
        partner.currentActiveJobCount = Math.max(0, partner.currentActiveJobCount - 1);
      }
    }

    // Cancel all active assignments
    const assignments = await this.repository.getAssignmentsForBooking(bookingId);
    for (const assignment of assignments) {
      await this.repository.updateAssignmentStatus(assignment.id, 'CANCELLED');
    }

    // Phase 3: Real-Time Cancellation Broadcast: tracking:{bookingId}
    this.trackingGateway?.broadcastCancellation(bookingId, reason);

    this.outboxService.enqueueEvent({
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      event_type: 'BOOKING_CANCELLED_BY_CUSTOMER',
      payload: {
        booking_id: bookingId,
        customer_id: customerId,
        reason,
        cancellation_fee: cancellationFee,
      },
    });

    return {
      success: true,
      bookingId,
      previousStatus,
      status: 'CANCELLED_BY_CUSTOMER',
      cancellationFee,
      redispatchAttempted: false,
      reason,
    };
  }

  /**
   * Partner cancels after assignment -> automatically triggers redispatch!
   */
  public async cancelByPartner(
    bookingId: string,
    partnerId: string,
    reason: string
  ): Promise<CancellationResult> {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!booking.assigned_partner_ids.includes(partnerId)) {
      throw new BadRequestException('Partner is not assigned to this booking');
    }

    if (['SERVICE_STARTED', 'SERVICE_COMPLETED'].includes(booking.status)) {
      throw new ConflictException('Cannot cancel after service has started');
    }

    // 1. Release this partner
    booking.assigned_partner_ids = booking.assigned_partner_ids.filter((id) => id !== partnerId);
    await this.repository.updatePartnerPresence(partnerId, 'AVAILABLE');
    const partner = await this.repository.getPartnerCandidate(partnerId);
    if (partner) {
      partner.currentActiveJobCount = Math.max(0, partner.currentActiveJobCount - 1);
    }

    // 2. Mark partner's assignment as CANCELLED
    const assignments = await this.repository.getAssignmentsForBooking(bookingId);
    const partnerAssignment = assignments.find((a) => a.partnerId === partnerId);
    if (partnerAssignment) {
      await this.repository.updateAssignmentStatus(partnerAssignment.id, 'CANCELLED');
    }

    // 3. Attempt immediate redispatch if booking still unfulfilled
    const requiredCount = booking.required_partner_count || 1;
    let redispatchAttempted = false;

    if (booking.assigned_partner_ids.length < requiredCount) {
      booking.status = 'MATCHING';
      await this.repository.saveBooking(booking);
      redispatchAttempted = await this.dispatchService.redispatchBooking(bookingId);
      if (!redispatchAttempted) {
        booking.status = 'UNFULFILLABLE';
        await this.repository.saveBooking(booking);
      }
    } else {
      await this.repository.saveBooking(booking);
    }

    // Phase 3: Real-Time Redispatch or Cancellation Broadcast: tracking:{bookingId}
    if (redispatchAttempted) {
      this.trackingGateway?.broadcastRedispatching(
        bookingId,
        'Partner had to cancel. Searching for a replacement partner immediately...'
      );
    } else {
      this.trackingGateway?.broadcastCancellation(bookingId, `Partner cancelled: ${reason}`);
    }

    this.outboxService.enqueueEvent({
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      event_type: 'PARTNER_CANCELLED_REDISPATCH',
      payload: {
        booking_id: bookingId,
        partner_id: partnerId,
        reason,
        redispatch_attempted: redispatchAttempted,
      },
    });

    return {
      success: true,
      bookingId,
      previousStatus: 'PARTNER_ACCEPTED',
      status: booking.status,
      cancellationFee: 0,
      redispatchAttempted,
      reason,
    };
  }
}
