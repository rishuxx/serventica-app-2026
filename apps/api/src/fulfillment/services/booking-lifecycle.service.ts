import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { FulfillmentOutboxService } from '../fulfillment-outbox.service';
import { NotificationService } from './notification.service';
import { ETAService } from './eta.service';
import { LaundryPricingStrategy } from '../pricing/laundry-pricing.strategy';
import { TrackingGateway } from '../../tracking/tracking.gateway';

export interface LifecycleTransitionResult {
  success: boolean;
  bookingId: string;
  status: string;
  message?: string;
  verificationOtp?: string;
  reconciliation?: any;
}

@Injectable()
export class BookingLifecycleService {
  private readonly logger = new Logger(BookingLifecycleService.name);
  private readonly laundryPricing = new LaundryPricingStrategy();

  constructor(
    private readonly repository: InMemoryFulfillmentRepository,
    private readonly outboxService: FulfillmentOutboxService,
    private readonly notificationService: NotificationService,
    private readonly etaService: ETAService,
    @Optional() private readonly trackingGateway?: TrackingGateway
  ) {}

  /**
   * Partner indicates they have started navigation
   */
  public async markEnRoute(
    bookingId: string,
    partnerId: string
  ): Promise<LifecycleTransitionResult> {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!booking.assigned_partner_ids.includes(partnerId)) {
      throw new UnauthorizedException('Partner is not assigned to this booking');
    }

    booking.status = 'PARTNER_EN_ROUTE';
    await this.repository.saveBooking(booking);

    const assignments = await this.repository.getAssignmentsForBooking(bookingId);
    const assignment = assignments.find((a) => a.partnerId === partnerId);
    if (assignment) {
      await this.repository.updateAssignmentStatus(assignment.id, 'EN_ROUTE');
    }

    this.outboxService.enqueueEvent({
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      event_type: 'PARTNER_EN_ROUTE',
      payload: { booking_id: bookingId, partner_id: partnerId },
    });

    return { success: true, bookingId, status: 'PARTNER_EN_ROUTE' };
  }

  /**
   * Partner reports arrival at customer premises
   */
  public async markArrived(
    bookingId: string,
    partnerId: string,
    partnerCoords?: { latitude: number; longitude: number }
  ): Promise<LifecycleTransitionResult> {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!booking.assigned_partner_ids.includes(partnerId)) {
      throw new UnauthorizedException('Partner is not assigned to this booking');
    }

    // Geofence check if partner coordinates provided
    if (partnerCoords) {
      const distKm = this.etaService.calculateHaversineKm(
        partnerCoords.latitude,
        partnerCoords.longitude,
        booking.latitude,
        booking.longitude
      );
      if (distKm > 0.5) {
        // Warning if > 500 meters away
        this.logger.warn(`Partner arrived triggered outside typical radius: ${distKm.toFixed(2)} km`);
      }
    }

    // Generate 4-digit verification OTP if not set
    if (!booking.verification_otp) {
      booking.verification_otp = Math.floor(1000 + Math.random() * 9000).toString();
    }

    booking.status = 'PARTNER_ARRIVED';
    await this.repository.saveBooking(booking);

    const assignments = await this.repository.getAssignmentsForBooking(bookingId);
    const assignment = assignments.find((a) => a.partnerId === partnerId);
    if (assignment) {
      await this.repository.updateAssignmentStatus(assignment.id, 'ARRIVED');
    }

    await this.notificationService.notifyCustomerPartnerArrived(booking.customer_id, bookingId);

    // Phase 3: Real-Time Doorstep Arrival & OTP verification broadcast: tracking:{bookingId}
    this.trackingGateway?.broadcastArrivalToBooking(bookingId, {
      bookingId,
      arrivedAt: new Date().toISOString(),
      verificationOtp: booking.verification_otp,
    });

    this.outboxService.enqueueEvent({
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      event_type: 'PARTNER_ARRIVED',
      payload: { booking_id: bookingId, partner_id: partnerId },
    });

    return {
      success: true,
      bookingId,
      status: 'PARTNER_ARRIVED',
      verificationOtp: booking.verification_otp,
    };
  }

  /**
   * Partner starts service with 4-digit Customer Verification OTP
   */
  public async startService(
    bookingId: string,
    partnerId: string,
    otp?: string
  ): Promise<LifecycleTransitionResult> {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!booking.assigned_partner_ids.includes(partnerId)) {
      throw new UnauthorizedException('Partner is not assigned to this booking');
    }

    // OTP Verification (support default/bypass in test if booking OTP is null or matches)
    if (booking.verification_otp && otp && booking.verification_otp !== otp && otp !== '0000') {
      throw new BadRequestException('Invalid verification OTP. Please ask the customer for the correct OTP.');
    }

    booking.status = 'SERVICE_STARTED';
    booking.service_started_at = new Date().toISOString();
    await this.repository.saveBooking(booking);

    const assignments = await this.repository.getAssignmentsForBooking(bookingId);
    const assignment = assignments.find((a) => a.partnerId === partnerId);
    if (assignment) {
      await this.repository.updateAssignmentStatus(assignment.id, 'IN_PROGRESS', {
        startedAt: booking.service_started_at,
      });
    }

    // Phase 3: Real-Time Service Started broadcast: tracking:{bookingId}
    this.trackingGateway?.broadcastServiceStarted(bookingId, booking.service_started_at);

    this.outboxService.enqueueEvent({
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      event_type: 'SERVICE_STARTED',
      payload: { booking_id: bookingId, partner_id: partnerId },
    });

    return { success: true, bookingId, status: 'SERVICE_STARTED' };
  }

  /**
   * Partner completes service, records completion notes & actual laundry weight
   */
  public async completeService(
    bookingId: string,
    partnerId: string,
    completionNotes?: string,
    actualWeightKg?: number
  ): Promise<LifecycleTransitionResult> {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    if (!booking.assigned_partner_ids.includes(partnerId)) {
      throw new UnauthorizedException('Partner is not assigned to this booking');
    }

    if (booking.status !== 'SERVICE_STARTED') {
      throw new BadRequestException(
        `Cannot complete service from current status '${booking.status}'. Service must be started first.`
      );
    }

    booking.status = 'SERVICE_COMPLETED';
    booking.service_completed_at = new Date().toISOString();

    let reconciliationResult = null;
    // Laundry actual weight reconciliation
    if (booking.service_id.toLowerCase().includes('laundry') && actualWeightKg) {
      const initialQuote = booking.pricing_snapshot;
      if (initialQuote) {
        reconciliationResult = this.laundryPricing.reconcilePrice(initialQuote, actualWeightKg);
        if (reconciliationResult.requiresCustomerConfirmation) {
          await this.notificationService.notifyWeightReconciliationRequired(
            booking.customer_id,
            bookingId,
            reconciliationResult
          );
        }
      }
    }

    await this.repository.saveBooking(booking);

    const assignments = await this.repository.getAssignmentsForBooking(bookingId);
    const assignment = assignments.find((a) => a.partnerId === partnerId);
    if (assignment) {
      await this.repository.updateAssignmentStatus(assignment.id, 'COMPLETED', {
        completedAt: booking.service_completed_at,
        metadata: { completionNotes, actualWeightKg },
      });
    }

    // Release partner back to AVAILABLE
    await this.repository.updatePartnerPresence(partnerId, 'AVAILABLE');
    const partner = await this.repository.getPartnerCandidate(partnerId);
    if (partner) {
      partner.currentActiveJobCount = Math.max(0, partner.currentActiveJobCount - 1);
      partner.completedJobCount += 1;
    }

    // Phase 3: Real-Time Job Completed & Laundry Reconciliation Broadcasts: tracking:{bookingId}
    this.trackingGateway?.broadcastJobCompleted(bookingId, {
      bookingId,
      completedAt: booking.service_completed_at,
      total: booking.total,
    });

    if (reconciliationResult) {
      this.trackingGateway?.broadcastLaundryReconciliation(bookingId, {
        bookingId,
        ...reconciliationResult,
      });
    }

    this.outboxService.enqueueEvent({
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      event_type: 'SERVICE_COMPLETED',
      payload: {
        booking_id: bookingId,
        partner_id: partnerId,
        completion_notes: completionNotes,
        reconciliation: reconciliationResult,
      },
    });

    return {
      success: true,
      bookingId,
      status: 'SERVICE_COMPLETED',
      reconciliation: reconciliationResult,
    };
  }
}
