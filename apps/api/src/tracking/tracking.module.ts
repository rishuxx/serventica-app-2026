import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { TrackingSessionService } from './tracking-session.service';
import { LocationValidationService } from './location-validation.service';
import { GeofenceService } from './geofence.service';
import { PushNotificationService } from './push-notification.service';
import { TrackingFeatureFlagsService } from './tracking-feature-flags.service';

@Module({
  providers: [
    TrackingGateway,
    TrackingSessionService,
    LocationValidationService,
    GeofenceService,
    PushNotificationService,
    TrackingFeatureFlagsService,
  ],
  exports: [
    TrackingGateway,
    TrackingSessionService,
    LocationValidationService,
    GeofenceService,
    PushNotificationService,
    TrackingFeatureFlagsService,
  ],
})
export class TrackingModule {}
