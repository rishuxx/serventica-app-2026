import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FulfillmentTransactionService } from './fulfillment-transaction.service';
import type {
  ConfirmBookingParams,
  ReassignPartnerParams,
  StartServiceParams,
  CompleteServiceParams,
  CancelBookingFulfillmentParams,
} from '@serventica/types';

@Controller('fulfillment')
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentTransactionService) {}

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
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
  async reassignPartner(@Body() body: ReassignPartnerParams) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }
    return this.fulfillmentService.reassignPartner(body);
  }

  @Post('start-service')
  @HttpCode(HttpStatus.OK)
  async startService(@Body() body: StartServiceParams) {
    if (!body.bookingId || !body.partnerId) {
      throw new BadRequestException('bookingId and partnerId are required');
    }
    return this.fulfillmentService.startService(body);
  }

  @Post('complete-service')
  @HttpCode(HttpStatus.OK)
  async completeService(@Body() body: CompleteServiceParams) {
    if (!body.bookingId || !body.partnerId) {
      throw new BadRequestException('bookingId and partnerId are required');
    }
    return this.fulfillmentService.completeService(body);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(@Body() body: CancelBookingFulfillmentParams) {
    if (!body.bookingId) {
      throw new BadRequestException('bookingId is required');
    }
    return this.fulfillmentService.cancelBooking(body);
  }
}
