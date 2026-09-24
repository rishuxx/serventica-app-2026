import { FulfillmentTransitionResult, ConfirmBookingParams, ReassignPartnerParams, StartServiceParams, CompleteServiceParams, CancelBookingFulfillmentParams } from '@serventica/types';
import { FulfillmentStateMachine } from './fulfillment-state-machine';
import { PricingEngineService } from './pricing-engine.service';
import { FulfillmentOutboxService } from './fulfillment-outbox.service';
import { TrackingSessionService } from '../tracking/tracking-session.service';
export declare class FulfillmentTransactionService {
    private readonly stateMachine;
    private readonly pricingEngine;
    private readonly outboxService;
    private readonly trackingSessionService;
    private readonly logger;
    private readonly bookings;
    private readonly idempotencyStore;
    constructor(stateMachine: FulfillmentStateMachine, pricingEngine: PricingEngineService, outboxService: FulfillmentOutboxService, trackingSessionService: TrackingSessionService);
    confirmBooking(params: ConfirmBookingParams): Promise<FulfillmentTransitionResult>;
    acceptOffer(bookingId: string, partnerId: string): Promise<FulfillmentTransitionResult>;
    reassignPartner(params: ReassignPartnerParams): Promise<FulfillmentTransitionResult>;
    startService(params: StartServiceParams): Promise<FulfillmentTransitionResult>;
    completeService(params: CompleteServiceParams): Promise<FulfillmentTransitionResult>;
    cancelBooking(params: CancelBookingFulfillmentParams): Promise<FulfillmentTransitionResult>;
}
