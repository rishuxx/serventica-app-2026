import { Controller, Get } from '@nestjs/common';
import { TrackingSessionService } from '../tracking/tracking-session.service';
import { TrackingFeatureFlagsService } from '../tracking/tracking-feature-flags.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly trackingSessionService: TrackingSessionService,
    private readonly featureFlagsService: TrackingFeatureFlagsService
  ) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'serventica-api',
    };
  }

  @Get('ready')
  getReady() {
    return {
      status: 'ready',
      database: 'connected',
      socket: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('tracking')
  getTrackingHealth() {
    const metrics = this.trackingSessionService.getMetrics();
    const flags = this.featureFlagsService.getFlags();
    return {
      status: 'healthy',
      metrics,
      featureFlags: flags,
      timestamp: new Date().toISOString(),
    };
  }
}
