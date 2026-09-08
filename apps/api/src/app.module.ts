import { Module } from '@nestjs/common';
import { CustomersController } from './customers/customers.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [],
  controllers: [CustomersController, HealthController],
  providers: [],
})
export class AppModule {}
