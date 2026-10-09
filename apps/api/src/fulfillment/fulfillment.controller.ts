import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { FulfillmentTransactionService } from './fulfillment-transaction.service';
import type {
  ConfirmBookingParams,
  ReassignPartnerParams,
  StartServiceParams,
  CompleteServiceParams,
  CancelBookingFulfillmentParams,
} from '@serventica/types';

/**
 * SERVENTICA — Fulfillment Controller (Production-Hardened)
 *
 * Rate Limiting Strategy:
 *   • confirmBooking:   5 per minute (prevents slot-locking abuse)
 *   • acceptOffer:      10 per minute (partner accept/reject flow)
 *   • cancelBooking:    3 per minute (prevents cancel-spam for refund abuse)
 *   • startService:     10 per minute (normal operational flow)
 *   • completeService:  10 per minute (normal operational flow)
 *
 * Auth: All endpoints require valid Supabase JWT via SupabaseAuthGuard.
 */
@Controller('fulfillment')
@UseGuards(SupabaseAuthGuard)
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentTransactionService) {}

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // Max 5 booking confirmations per minute
  async confirmBooking(
    @Body() body: ConfirmBookingParams,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    if (!body.bookingId || !body.customerId) {
      throw new BadRequestException('bookingId and customerId are required');
    }
    return this.fulfillmentService.confirmBooking({
      ...body,
      idempotencyKey: idempotencyKey || body.idempotencyKey,
    });
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // Max 10 accept/reject per minute
  async acceptOffer(
    @Body() body: { bookingId: string; partnerId: string }
  ) {
    if (!body.bookingId || !body.partnerId) {
      throw new BadRequestException('bookingId and partnerId are required');
    }
    return this.fulfillmentService.acceptOffer(body.bookingId, body.partnerId);
  }

  @Post('reassign')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async reassignPartner(@Body() body: ReassignPartnerParams) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }
    return this.fulfillmentService.reassignPartner(body);
  }

  @Post('start-service')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async startService(@Body() body: StartServiceParams) {
    if (!body.bookingId || !body.partnerId) {
      throw new BadRequestException('bookingId and partnerId are required');
    }
    return this.fulfillmentService.startService(body);
  }

  @Post('complete-service')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async completeService(@Body() body: CompleteServiceParams) {
    if (!body.bookingId || !body.partnerId) {
      throw new BadRequestException('bookingId and partnerId are required');
    }
    return this.fulfillmentService.completeService(body);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // Strict: 3 cancels per minute (refund abuse prevention)
  async cancelBooking(@Body() body: CancelBookingFulfillmentParams) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }
    return this.fulfillmentService.cancelBooking(body);
  }
}
