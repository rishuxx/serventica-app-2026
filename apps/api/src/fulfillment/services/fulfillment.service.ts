import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateInstantDispatchParams, FulfillmentIntent } from '@serventica/types';
import { InMemoryFulfillmentRepository } from '../repositories/in-memory-fulfillment.repository';
import { QuoteService } from './quote.service';
import { ServiceabilityService } from './serviceability.service';
import { DispatchService } from './dispatch.service';
import { ServicePolicyFactory } from '../policies/service-policy.factory';
import { BookingRecord } from '../repositories/fulfillment.repository.interface';
import { FulfillmentOutboxService } from '../fulfillment-outbox.service';

export interface InstantDispatchResponse {
  success: boolean;
  bookingId: string;
  intentId: string;
  status: string;
  statusTimeline: Array<{ status: string; timestamp: string }>;
  estimatedArrivalMinutes: number;
  trackingChannel: string;
  quoteSnapshot: any;
}

@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);
  private readonly idempotencyStore = new Map<string, InstantDispatchResponse>();

  constructor(
    private readonly repository: InMemoryFulfillmentRepository,
    private readonly quoteService: QuoteService,
    private readonly serviceabilityService: ServiceabilityService,
    private readonly dispatchService: DispatchService,
    private readonly policyFactory: ServicePolicyFactory,
    private readonly outboxService: FulfillmentOutboxService
  ) {}

  /**
   * Primary entry point: Customer launches Instant request
   */
  public async createInstantDispatch(
    customerId: string,
    params: CreateInstantDispatchParams,
    coordinates?: { latitude: number; longitude: number }
  ): Promise<InstantDispatchResponse> {
    // 1. Idempotency Check
    if (params.idempotencyKey && this.idempotencyStore.has(params.idempotencyKey)) {
      this.logger.log(`Returning idempotent dispatch response for key: ${params.idempotencyKey}`);
      return this.idempotencyStore.get(params.idempotencyKey)!;
    }

    // 2. Retrieve locked, authoritative Quote Snapshot
    const quote = this.quoteService.getValidQuote(params.quoteId);

    // 3. Resolve & validate Service Policy
    const policy = this.policyFactory.getPolicy(params.serviceSlug);
    const validation = policy.validateTaskRequirements(params.requirements);
    if (!validation.isValid) {
      throw new BadRequestException({
        code: validation.code || 'INVALID_REQUIREMENTS',
        message: validation.reason,
        recommendedService: validation.recommendedService,
      });
    }

    const lat = coordinates?.latitude || 30.316494;
    const lon = coordinates?.longitude || 78.032191;

    // 4. Verify live serviceability
    const serviceability = await this.serviceabilityService.checkServiceability(
      params.serviceSlug,
      lat,
      lon
    );
    if (!serviceability.serviceable) {
      throw new ConflictException({
        code: 'UNSERVICEABLE',
        message: serviceability.reason || 'Service not currently available at this location',
      });
    }

    const now = new Date().toISOString();
    const intentId = `fint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const bookingId = `bok_inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const bookingNumber = `SRV-INST-${bookingId.slice(-6).toUpperCase()}`;

    // 5. Create Fulfillment Intent
    const intent: FulfillmentIntent = {
      id: intentId,
      customerId,
      serviceId: policy.serviceType,
      instantServiceType: policy.serviceType,
      fulfillmentMode: 'INSTANT',
      serviceRequirementId: `sreq_${bookingId}`,
      addressId: params.addressId,
      pickupCoordinates: { latitude: lat, longitude: lon },
      status: 'MATCHING',
      quoteId: quote.quoteId,
      idempotencyKey: params.idempotencyKey || null,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveIntent(intent);

    // 6. Create Canonical Booking Record
    const requiredPartnerCount = params.requirements.requiredPartnerCount || policy.minPartnerCount;
    const bookingRecord: BookingRecord = {
      id: bookingId,
      booking_number: bookingNumber,
      customer_id: customerId,
      customer_name: 'Customer',
      customer_phone: '+919876543210',
      service_id: policy.serviceType,
      fulfillment_mode: 'INSTANT',
      status: 'MATCHING',
      subtotal: quote.subtotal,
      total: quote.totalPayable,
      currency: quote.currency || 'INR',
      address_id: params.addressId,
      address_line: 'Doorstep Service Location',
      latitude: lat,
      longitude: lon,
      pricing_snapshot: quote,
      service_requirement_id: `sreq_${bookingId}`,
      service_requirement: {
        serviceTitle: policy.defaultTitle,
        durationMinutes: params.requirements.durationMinutes,
        requiredPartnerCount,
        taskCategory: params.requirements.taskCategory,
        vehicleType: params.requirements.vehicleType,
        issueType: params.requirements.issueType,
        fuelType: params.requirements.fuelType,
        fuelQuantityLitres: params.requirements.fuelQuantityLitres,
        approxLoadKg: params.requirements.approxLoadKg,
        customerNotes: params.requirements.specialInstructions,
      },
      assigned_partner_ids: [],
      required_partner_count: requiredPartnerCount,
      verification_otp: Math.floor(1000 + Math.random() * 9000).toString(),
      created_at: now,
      updated_at: now,
    };
    await this.repository.saveBooking(bookingRecord);

    // 7. Enqueue initial outbox audit event
    this.outboxService.enqueueEvent({
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      booking_id: bookingId,
      event_type: 'INSTANT_DISPATCH_INITIATED',
      payload: {
        booking_id: bookingId,
        customer_id: customerId,
        service: policy.serviceType,
        total: quote.totalPayable,
      },
    });

    // 8. Launch automated Dispatch Wave
    await this.dispatchService.initiateDispatch(bookingRecord);

    const response: InstantDispatchResponse = {
      success: true,
      bookingId,
      intentId,
      status: 'MATCHING',
      statusTimeline: [
        { status: 'REQUESTED', timestamp: now },
        { status: 'MATCHING', timestamp: new Date().toISOString() },
      ],
      estimatedArrivalMinutes: serviceability.estimatedEtaMinutes || 10,
      trackingChannel: `tracking:${bookingId}`,
      quoteSnapshot: quote,
    };

    if (params.idempotencyKey) {
      this.idempotencyStore.set(params.idempotencyKey, response);
    }

    return response;
  }

  /**
   * Retrieves live status of an instant booking
   */
  public async getBookingStatus(bookingId: string) {
    const booking = await this.repository.getBooking(bookingId);
    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    const assignments = await this.repository.getAssignmentsForBooking(bookingId);
    const assignedPartners = [];

    for (const assignment of assignments) {
      const partner = await this.repository.getPartnerCandidate(assignment.partnerId);
      if (partner) {
        assignedPartners.push({
          partnerId: partner.partnerId,
          fullName: partner.fullName,
          phone: partner.phone,
          rating: partner.rating,
          role: assignment.role,
          status: assignment.assignmentStatus,
          coordinates: { latitude: partner.lastLatitude, longitude: partner.lastLongitude },
        });
      }
    }

    return {
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      serviceId: booking.service_id,
      status: booking.status,
      assignedPartners,
      requiredPartnerCount: booking.required_partner_count,
      pricing: booking.pricing_snapshot,
      verificationOtp: booking.verification_otp,
      serviceStartedAt: booking.service_started_at,
      serviceCompletedAt: booking.service_completed_at,
      trackingChannel: `tracking:${booking.id}`,
    };
  }
}
