import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomersController } from './customers/customers.controller';
import { HealthController } from './health/health.controller';
import { TrackingModule } from './tracking/tracking.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { FinanceModule } from './finance/finance.module';
import { PartnerModule } from './partner/partner.module';
import { AdminModule } from './admin/admin.module';

/**
 * SERVENTICA — Root Application Module
 * Production-hardened with multi-tier rate limiting via @nestjs/throttler.
 *
 * Rate Limiting Tiers:
 *   • "default"  — 100 requests/minute per IP (global baseline)
 *   • "short"    — 20 requests/10 seconds per IP (burst protection)
 *   • "long"     — 1000 requests/hour per IP (sustained abuse prevention)
 *
 * Per-route overrides (e.g. OTP, payments) are applied via @Throttle() decorator
 * on individual controller methods.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 10_000,   // 10 second window
        limit: 20,     // Max 20 requests per 10s per IP
      },
      {
        name: 'default',
        ttl: 60_000,   // 1 minute window
        limit: 100,    // Max 100 requests per minute per IP
      },
      {
        name: 'long',
        ttl: 3_600_000, // 1 hour window
        limit: 1000,    // Max 1000 requests per hour per IP
      },
    ]),
    TrackingModule,
    FulfillmentModule,
    FinanceModule,
    PartnerModule,
    AdminModule,
  ],
  controllers: [CustomersController, HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
