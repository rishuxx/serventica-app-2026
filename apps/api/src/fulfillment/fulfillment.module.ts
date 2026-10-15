import { Module } from '@nestjs/common';
import { TrackingModule } from '../tracking/tracking.module';

// Existing Providers & Controllers
import { FulfillmentStateMachine } from './fulfillment-state-machine';
import { PricingEngineService } from './pricing-engine.service';
import { FulfillmentOutboxService } from './fulfillment-outbox.service';
import { FulfillmentTransactionService } from './fulfillment-transaction.service';
import { FulfillmentController } from './fulfillment.controller';

// Phase 2 Fulfillment Engine Components
import { InstantController } from './instant.controller';
import { InMemoryFulfillmentRepository } from './repositories/in-memory-fulfillment.repository';
import { PricingStrategyFactory } from './pricing/pricing-strategy.factory';
import { ServicePolicyFactory } from './policies/service-policy.factory';
import {
  ETAService,
  CapacityService,
  PartnerEligibilityService,
  PartnerMatchingService,
  ServiceabilityService,
  QuoteService,
  DispatchService,
  AssignmentService,
  ExtensionService,
  CancellationService,
  NotificationService,
  BookingLifecycleService,
  FulfillmentService,
} from './services';

@Module({
  imports: [TrackingModule],
  controllers: [FulfillmentController, InstantController],
  providers: [
    // Existing
    FulfillmentStateMachine,
    PricingEngineService,
    FulfillmentOutboxService,
    FulfillmentTransactionService,

    // Repositories & Factories
    InMemoryFulfillmentRepository,
    PricingStrategyFactory,
    ServicePolicyFactory,

    // Domain Services
    ETAService,
    CapacityService,
    PartnerEligibilityService,
    PartnerMatchingService,
    ServiceabilityService,
    QuoteService,
    DispatchService,
    AssignmentService,
    ExtensionService,
    CancellationService,
    NotificationService,
    BookingLifecycleService,
    FulfillmentService,
  ],
  exports: [
    FulfillmentStateMachine,
    PricingEngineService,
    FulfillmentOutboxService,
    FulfillmentTransactionService,
    InMemoryFulfillmentRepository,
    PricingStrategyFactory,
    ServicePolicyFactory,
    ETAService,
    CapacityService,
    PartnerEligibilityService,
    PartnerMatchingService,
    ServiceabilityService,
    QuoteService,
    DispatchService,
    AssignmentService,
    ExtensionService,
    CancellationService,
    NotificationService,
    BookingLifecycleService,
    FulfillmentService,
  ],
})
export class FulfillmentModule {}
