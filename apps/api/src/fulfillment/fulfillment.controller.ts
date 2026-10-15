import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
 * SERVENTICA — Fulfillment Controller (Hardened against BOLA/IDOR)
 *
 * Security Controls:
 *   • Authentication: All routes guarded by SupabaseAuthGuard
 *   • BOLA Defense: Customer ID and Partner ID are bound to verified JWT principal
 *   • Rate Limiting: Strict per-route throttle prevents spam and slot-locking
 */
@Controller('fulfillment')
@UseGuards(SupabaseAuthGuard)
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentTransactionService) {}

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirmBooking(
    @Body() body: ConfirmBookingParams,
    @Req() req: any,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    // Authoritative caller binding: prevent customer spoofing / BOLA
    const callerId = req.user?.id;
    if (!callerId) {
      throw new ForbiddenException('Authenticated user ID missing');
    }

    return this.fulfillmentService.confirmBooking({
      ...body,
      customerId: callerId, // Authoritatively bound to token
      idempotencyKey: idempotencyKey || body.idempotencyKey,
    });
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async acceptOffer(
    @Body() body: { bookingId: string; partnerId?: string },
    @Req() req: any
  ) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    const callerId = req.user?.id;
    if (!callerId) {
      throw new ForbiddenException('Authenticated user ID missing');
    }

    // Bind partner ID authoritatively to authenticated caller
    return this.fulfillmentService.acceptOffer(body.bookingId, callerId);
  }

  @Post('reassign')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async reassignPartner(
    @Body() body: ReassignPartnerParams,
    @Req() req: any
  ) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    const callerId = req.user?.id;
    return this.fulfillmentService.reassignPartner({
      ...body,
      actorId: callerId || body.actorId,
    });
  }

  @Post('start-service')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async startService(
    @Body() body: StartServiceParams,
    @Req() req: any
  ) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    const callerId = req.user?.id;
    if (!callerId) {
      throw new ForbiddenException('Authenticated partner ID missing');
    }

    return this.fulfillmentService.startService({
      ...body,
      partnerId: callerId, // Authoritatively bound
    });
  }

  @Post('complete-service')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async completeService(
    @Body() body: CompleteServiceParams,
    @Req() req: any
  ) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    const callerId = req.user?.id;
    if (!callerId) {
      throw new ForbiddenException('Authenticated partner ID missing');
    }

    return this.fulfillmentService.completeService({
      ...body,
      partnerId: callerId, // Authoritatively bound
    });
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async cancelBooking(
    @Body() body: CancelBookingFulfillmentParams,
    @Req() req: any
  ) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    const callerId = req.user?.id;
    return this.fulfillmentService.cancelBooking({
      ...body,
      actorId: callerId || body.actorId,
    });
  }
}
