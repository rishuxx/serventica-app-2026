import { Module } from '@nestjs/common';
import { CustomersController } from './customers/customers.controller';
import { HealthController } from './health/health.controller';
import { TrackingModule } from './tracking/tracking.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [TrackingModule, FulfillmentModule, FinanceModule],
  controllers: [CustomersController, HealthController],
  providers: [],
})
export class AppModule {}
