import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import {
  FulfillmentService,
  QuoteService,
  ServiceabilityService,
  ExtensionService,
  CancellationService,
  ETAService,
} from './services';
import type { CalculateInstantQuoteParams, CreateInstantDispatchParams } from '@serventica/types';
import { ServicePolicyFactory } from './policies/service-policy.factory';

@Controller(['instant', 'api/v1/instant'])
@UseGuards(SupabaseAuthGuard)
export class InstantController {
  constructor(
    private readonly fulfillmentService: FulfillmentService,
    private readonly quoteService: QuoteService,
    private readonly serviceabilityService: ServiceabilityService,
    private readonly extensionService: ExtensionService,
    private readonly cancellationService: CancellationService,
    private readonly policyFactory: ServicePolicyFactory,
    private readonly etaService: ETAService
  ) {}

  private extractCustomerId(req: any): string {
    return req.user?.id || 'usr_instant_customer';
  }

  @Get('services')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getInstantCatalog(
    @Query('latitude') latStr?: string,
    @Query('longitude') lonStr?: string
  ) {
    const lat = latStr ? parseFloat(latStr) : 30.316494;
    const lon = lonStr ? parseFloat(lonStr) : 78.032191;

    const policies = this.policyFactory.getAllPolicies();
    const serviceResults = [];

    const catalogMetadata: Record<string, { slug: string; subtitle: string; startingPrice: number; color: string; badge: string }> = {
      HELPING_HAND: {
        slug: 'helping-hand',
        subtitle: 'From 30 mins',
        startingPrice: 59.0,
        color: '#7C3AED',
        badge: 'Popular',
      },
      ROAD_HELP: {
        slug: 'road-help',
        subtitle: 'Get help nearby',
        startingPrice: 99.0,
        color: '#4F46E5',
        badge: 'Roadside',
      },
      LAUNDRY: {
        slug: 'laundry',
        subtitle: 'Doorstep pickup',
        startingPrice: 149.0,
        color: '#6366F1',
        badge: 'Express',
      },
      PACK_MOVE: {
        slug: 'pack-move',
        subtitle: 'Get moving help',
        startingPrice: 249.0,
        color: '#EA580C',
        badge: 'Multi-helper',
      },
    };

    for (const policy of policies) {
      const meta = catalogMetadata[policy.serviceType];
      const serviceability = await this.serviceabilityService.checkServiceability(
        policy.serviceType,
        lat,
        lon
      );

      serviceResults.push({
        id: `inst_${meta.slug.replace('-', '_')}`,
        slug: meta.slug,
        title: policy.defaultTitle,
        subtitle: meta.subtitle,
        startingPrice: meta.startingPrice,
        estimatedArrivalMinutes: serviceability.serviceable ? serviceability.estimatedEtaMinutes : policy.maxEtaMinutes,
        instantEnabled: serviceability.serviceable,
        themeColor: meta.color,
        badge: meta.badge,
        availableCapacity: serviceability.availableCapacityCount,
      });
    }

    return {
      serviceable: serviceResults.some((s) => s.instantEnabled),
      zoneId: 'zone_dehradun_central',
      services: serviceResults,
    };
  }

  @Post('serviceability')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async checkServiceability(
    @Body() body: { serviceSlug: string; latitude: number; longitude: number }
  ) {
    if (!body.serviceSlug || body.latitude === undefined || body.longitude === undefined) {
      throw new BadRequestException('serviceSlug, latitude, and longitude are required');
    }
    return this.serviceabilityService.checkServiceability(
      body.serviceSlug,
      body.latitude,
      body.longitude
    );
  }

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async calculateQuote(@Body() body: CalculateInstantQuoteParams) {
    if (!body.serviceSlug) {
      throw new BadRequestException('serviceSlug is required');
    }
    return this.quoteService.generateQuote(body);
  }

  @Post('dispatch')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createDispatch(
    @Body() body: CreateInstantDispatchParams,
    @Req() req: any,
    @Headers('x-idempotency-key') idempotencyHeader?: string
  ) {
    const customerId = this.extractCustomerId(req);
    const key = idempotencyHeader || body.idempotencyKey;

    return this.fulfillmentService.createInstantDispatch(
      customerId,
      { ...body, idempotencyKey: key }
    );
  }

  @Get('bookings/:id/status')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getBookingStatus(@Param('id') bookingId: string) {
    return this.fulfillmentService.getBookingStatus(bookingId);
  }

  @Post('bookings/:id/extend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestExtension(
    @Param('id') bookingId: string,
    @Body() body: { additionalMinutes: number }
  ) {
    if (!body.additionalMinutes) {
      throw new BadRequestException('additionalMinutes is required');
    }
    return this.extensionService.requestExtension(bookingId, body.additionalMinutes);
  }

  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async cancelBooking(
    @Param('id') bookingId: string,
    @Body() body: { reason?: string },
    @Req() req: any
  ) {
    const customerId = this.extractCustomerId(req);
    return this.cancellationService.cancelByCustomer(
      bookingId,
      customerId,
      body.reason || 'CANCELLED_BY_USER'
    );
  }
}
