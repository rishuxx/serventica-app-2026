import { Module } from '@nestjs/common';
import { FulfillmentStateMachine } from './fulfillment-state-machine';
import { PricingEngineService } from './pricing-engine.service';
import { FulfillmentOutboxService } from './fulfillment-outbox.service';
import { FulfillmentTransactionService } from './fulfillment-transaction.service';
import { FulfillmentController } from './fulfillment.controller';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [TrackingModule],
  controllers: [FulfillmentController],
  providers: [
    FulfillmentStateMachine,
    PricingEngineService,
    FulfillmentOutboxService,
    FulfillmentTransactionService,
  ],
  exports: [
    FulfillmentStateMachine,
    PricingEngineService,
    FulfillmentOutboxService,
    FulfillmentTransactionService,
  ],
})
export class FulfillmentModule {}
