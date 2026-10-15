import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { CapacityService } from './capacity.service';
import { PricingStrategyFactory } from '../pricing/pricing-strategy.factory';
import { FulfillmentOutboxService } from '../fulfillment-outbox.service';
import { InstantBookingExtension } from '@serventica/types';
import { TrackingGateway } from '../../tracking/tracking.gateway';

export interface ExtensionRequestResult {
  extensionId: string;
  bookingId: string;
  additionalMinutes: number;
  additionalPrice: number;
  currency: string;
  status: 'REQUESTED';
  expiresAt: string;
}

export interface ExtensionResponseResult {
  success: boolean;
  bookingId: string;
  extensionId: string;
  accepted: boolean;
  newDurationMinutes: number;
  newTotal: number;
  additionalPayout: number;
}

@Injectable()
export class ExtensionService {
  private readonly logger = new Logger(ExtensionService.name);

  // Maximum total allowed duration for Helping Hand is 240 minutes (4 hours)
  private readonly MAX_TOTAL_DURATION_MINUTES = 240;

  constructor(
    private readonly repository: InMemoryFulfillmentRepository,
    private readonly capacityService: CapacityService,
    private readonly pricingFactory: PricingStrategyFactory,
    private readonly outboxService: FulfillmentOutboxService,
    @Optional() private readonly trackingGateway?: TrackingGateway
  ) {}

  /**
   * Customer initiates an extension request
   */
  public async requestExtension(
    bookingId: string,
    additionalMinutes: number
  ): Promise<ExtensionRequestResult> {
    if (![30, 60, 90, 120].includes(additionalMinutes)) {
      throw new BadRequestException('Extensions must be requested in 30-minute intervals (30, 60, 90, 120 min)');
    }

    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!['SERVICE_STARTED', 'IN_PROGRESS', 'PARTNER_ARRIVED'].includes(booking.status)) {
      throw new BadRequestException(`Cannot extend booking in status: ${booking.status}. Service must be active.`);
    }

    const currentDuration = booking.service_requirement?.durationMinutes || 60;
    const prospectiveDuration = currentDuration + additionalMinutes;

    if (prospectiveDuration > this.MAX_TOTAL_DURATION_MINUTES) {
      throw new BadRequestException(
        `Total duration cannot exceed ${this.MAX_TOTAL_DURATION_MINUTES} minutes (4 hours). Current: ${currentDuration}m, requested: +${additionalMinutes}m (total ${prospectiveDuration}m)`
      );
    }

    // Check primary assigned partner's schedule capacity
    const primaryPartnerId = booking.assigned_partner_ids[0];
    if (primaryPartnerId) {
      const partner = await this.repository.getPartnerCandidate(primaryPartnerId);
      if (partner) {
        const capacityCheck = this.capacityService.validateExtensionCapacity(partner, additionalMinutes);
        if (!capacityCheck.hasCapacity) {
          throw new ConflictException({
            code: 'PARTNER_SCHEDULE_CONFLICT',
            message: capacityCheck.reason || 'Partner has a subsequent booking and cannot extend',
          });
        }
      }
    }

    // Calculate incremental pricing
    const pricingStrategy = this.pricingFactory.getStrategy(booking.service_id);
    const quote = pricingStrategy.calculate({
      serviceSlug: booking.service_id,
      latitude: booking.latitude,
      longitude: booking.longitude,
      requirements: {
        durationMinutes: additionalMinutes,
        requiredPartnerCount: booking.required_partner_count || 1,
      },
    });

    const extensionId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const extensionRecord: InstantBookingExtension = {
      id: extensionId,
      bookingId,
      additionalMinutes,
      quoteId: quote.quoteId,
      status: 'REQUESTED',
      requestedAt: new Date().toISOString(),
      expiresAt,
      conflictChecked: true,
    };

    await this.repository.saveExtension(extensionRecord);

    // Phase 3: Real-Time Extension Prompt Broadcast to primary partner room: partner:{partnerId}
    if (primaryPartnerId) {
      this.trackingGateway?.broadcastExtensionPrompt(primaryPartnerId, {
        bookingId,
        extensionId,
        additionalMinutes,
        additionalPayout: Math.round((additionalMinutes / 60) * 118 * 0.8),
        expiresAt,
      });
    }

    return {
      extensionId,
      bookingId,
      additionalMinutes,
      additionalPrice: quote.totalPayable,
      currency: booking.currency || 'INR',
      status: 'REQUESTED',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Partner responds to an extension request (accept/decline)
   */
  public async respondExtension(
    bookingId: string,
    extensionId: string,
    partnerId: string,
    accepted: boolean
  ): Promise<ExtensionResponseResult> {
    const extension = await this.repository.getExtension(extensionId);
    if (!extension || extension.bookingId !== bookingId) {
      throw new BadRequestException('Extension request not found for this booking');
    }

    if (extension.status !== 'REQUESTED') {
      throw new ConflictException(`Extension has already been responded to (${extension.status})`);
    }

    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!accepted) {
      await this.repository.updateExtensionStatus(extensionId, 'DECLINED');
      return {
        success: false,
        bookingId,
        extensionId,
        accepted: false,
        newDurationMinutes: booking.service_requirement?.durationMinutes || 60,
        newTotal: booking.total,
        additionalPayout: 0,
      };
    }

    // Partner accepted extension: update booking atomically
    const currentDuration = booking.service_requirement?.durationMinutes || 60;
    const newDurationMinutes = currentDuration + extension.additionalMinutes;
    const additionalPayout = Math.round((extension.additionalMinutes / 60) * 118 * 0.8);

    booking.service_requirement = {
      ...booking.service_requirement,
      durationMinutes: newDurationMinutes,
    };
    booking.total = Math.round((booking.total + (extension.additionalMinutes / 60) * 118) * 100) / 100;
    await this.repository.saveBooking(booking);

    await this.repository.updateExtensionStatus(extensionId, 'ACCEPTED');

    // Phase 3: Real-Time Extension Confirmed Broadcast to customer tracking room: tracking:{bookingId}
    this.trackingGateway?.broadcastExtensionConfirmed(bookingId, {
      bookingId,
      extensionId,
      newDurationMinutes,
      newTotal: booking.total,
    });

    // Enqueue audit outbox event
    this.outboxService.enqueueEvent({
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      event_type: 'BOOKING_EXTENDED',
      payload: {
        booking_id: bookingId,
        partner_id: partnerId,
        additional_minutes: extension.additionalMinutes,
        new_duration_minutes: newDurationMinutes,
        new_total: booking.total,
      },
    });

    return {
      success: true,
      bookingId,
      extensionId,
      accepted: true,
      newDurationMinutes,
      newTotal: booking.total,
      additionalPayout,
    };
  }
}
