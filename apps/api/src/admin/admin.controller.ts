import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { AdminService } from './admin.service';

@Controller(['admin', 'api/v1/admin'])
@UseGuards(SupabaseAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private extractAdminId(req: any): string {
    return req.user?.id || 'admin_ops_01';
  }

  @Get('instant/stats')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getStats() {
    return this.adminService.getInstantOperationsStats();
  }

  @Get('instant/bookings')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getLiveBookings(
    @Query('status') status?: string,
    @Query('service') service?: string,
    @Query('limit') limit?: string
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 50;
    return this.adminService.getLiveBookings({ status, service, limit: numLimit });
  }

  @Get('instant/bookings/:bookingId')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getBookingDetail(@Param('bookingId') bookingId: string) {
    return this.adminService.getBookingDetails(bookingId);
  }

  @Post('instant/bookings/:bookingId/reassign')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async reassignPartner(
    @Param('bookingId') bookingId: string,
    @Body() body: { newPartnerId: string; reason: string },
    @Req() req: any
  ) {
    if (!body.newPartnerId) {
      throw new BadRequestException('newPartnerId is required');
    }
    const adminId = this.extractAdminId(req);
    return this.adminService.manuallyReassignPartner({
      bookingId,
      newPartnerId: body.newPartnerId,
      reason: body.reason || 'Manual reassignment via Operations console',
      adminId,
    });
  }

  @Post('instant/bookings/:bookingId/cancel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body() body: { reason: string },
    @Req() req: any
  ) {
    const adminId = this.extractAdminId(req);
    return this.adminService.cancelBooking(
      bookingId,
      body.reason || 'Cancelled by Operations Admin',
      adminId
    );
  }

  @Put('partners/:partnerId/capabilities')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async updatePartnerCapabilities(
    @Param('partnerId') partnerId: string,
    @Body() body: { capabilities: string[]; isApproved: boolean },
    @Req() req: any
  ) {
    const adminId = this.extractAdminId(req);
    return this.adminService.updatePartnerCapabilities(
      partnerId,
      body.capabilities,
      body.isApproved,
      adminId
    );
  }

  @Post('services/policy')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async updateServicePolicy(
    @Body() body: { serviceId: string; instantEnabled?: boolean; maxRadiusKm?: number; maxInitialDurationMinutes?: number; fuelMaxLitres?: number },
    @Req() req: any
  ) {
    const adminId = this.extractAdminId(req);
    return this.adminService.updateServicePolicyConfig({
      ...body,
      adminId,
    });
  }

  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getAuditLogs(@Query('limit') limit?: string) {
    const numLimit = limit ? parseInt(limit, 10) : 100;
    return this.adminService.getAuditLogs({ limit: numLimit });
  }
}
