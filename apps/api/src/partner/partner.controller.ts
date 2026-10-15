import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { PartnerService } from './partner.service';

@Controller(['partner', 'api/v1/partner'])
@UseGuards(SupabaseAuthGuard)
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  private extractPartnerId(req: any): string {
    return req.user?.id || 'prt_hh_01';
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getProfile(@Req() req: any) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.getPartnerProfile(partnerId);
  }

  @Get('earnings')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getEarnings(@Req() req: any) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.getEarnings(partnerId);
  }

  @Post('presence/status')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async updateStatus(
    @Body() body: { status: 'ONLINE' | 'AVAILABLE' | 'BUSY' | 'PAUSED' | 'OFFLINE'; currentLatitude?: number; currentLongitude?: number },
    @Req() req: any
  ) {
    const partnerId = this.extractPartnerId(req);
    const coords =
      body.currentLatitude !== undefined && body.currentLongitude !== undefined
        ? { latitude: body.currentLatitude, longitude: body.currentLongitude }
        : undefined;

    return this.partnerService.updatePresenceStatus(partnerId, body.status, coords);
  }

  @Post('presence/heartbeat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async heartbeat(
    @Body() body: { latitude: number; longitude: number; heading?: number; speed?: number; accuracy?: number; recordedAt?: string },
    @Req() req: any
  ) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.recordHeartbeat(partnerId, body);
  }

  @Get('dispatch/offers/active')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getActiveOffer(@Req() req: any) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.getActiveOffer(partnerId);
  }

  @Post('dispatch/offers/:offerId/accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async acceptOffer(
    @Param('offerId') offerId: string,
    @Body() body: { currentLocation?: { latitude: number; longitude: number } },
    @Req() req: any
  ) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.acceptOffer(partnerId, offerId, body.currentLocation);
  }

  @Post('dispatch/offers/:offerId/decline')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async declineOffer(
    @Param('offerId') offerId: string,
    @Body() body: { reason?: string },
    @Req() req: any
  ) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.declineOffer(partnerId, offerId, body.reason);
  }

  @Post('jobs/:jobId/en-route')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async markEnRoute(@Param('jobId') jobId: string, @Req() req: any) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.markEnRoute(partnerId, jobId);
  }

  @Post('jobs/:jobId/arrived')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async markArrived(
    @Param('jobId') jobId: string,
    @Body() body: { currentLocation?: { latitude: number; longitude: number } },
    @Req() req: any
  ) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.markArrived(partnerId, jobId, body.currentLocation);
  }

  @Post('jobs/:jobId/start')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async startService(
    @Param('jobId') jobId: string,
    @Body() body: { verificationOtp?: string },
    @Req() req: any
  ) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.startService(partnerId, jobId, body.verificationOtp);
  }

  @Post('jobs/:jobId/complete')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async completeService(
    @Param('jobId') jobId: string,
    @Body() body: { completionNotes?: string; actualWeightKg?: number },
    @Req() req: any
  ) {
    const partnerId = this.extractPartnerId(req);
    return this.partnerService.completeService(
      partnerId,
      jobId,
      body.completionNotes,
      body.actualWeightKg
    );
  }

  @Post('jobs/:jobId/extension-response')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async respondToExtension(
    @Param('jobId') jobId: string,
    @Body() body: { extensionId: string; accepted: boolean },
    @Req() req: any
  ) {
    const partnerId = this.extractPartnerId(req);
    if (!body.extensionId) {
      throw new BadRequestException('extensionId is required');
    }
    return this.partnerService.respondToExtension(
      partnerId,
      jobId,
      body.extensionId,
      body.accepted
    );
  }
}
