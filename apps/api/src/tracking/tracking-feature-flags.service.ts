import { Injectable, Logger } from '@nestjs/common';

export interface TrackingFeatureFlagsConfig {
  geofenceArrivalEnabled: boolean;
  pushNotificationsEnabled: boolean;
  strictJumpRejection: boolean;
  debouncedPersistenceEnabled: boolean;
  maxAccuracyMeters: number;
}

@Injectable()
export class TrackingFeatureFlagsService {
  private readonly logger = new Logger(TrackingFeatureFlagsService.name);

  private flags: TrackingFeatureFlagsConfig = {
    geofenceArrivalEnabled: process.env.FEATURE_GEOFENCE_ARRIVAL !== 'false',
    pushNotificationsEnabled: process.env.FEATURE_PUSH_NOTIFICATIONS !== 'false',
    strictJumpRejection: process.env.FEATURE_STRICT_JUMP_REJECTION !== 'false',
    debouncedPersistenceEnabled: process.env.FEATURE_DEBOUNCED_PERSISTENCE !== 'false',
    maxAccuracyMeters: Number(process.env.TRACKING_MAX_ACCURACY_METERS || 100),
  };

  public getFlags(): TrackingFeatureFlagsConfig {
    return { ...this.flags };
  }

  public isGeofenceArrivalEnabled(): boolean {
    return this.flags.geofenceArrivalEnabled;
  }

  public isPushNotificationsEnabled(): boolean {
    return this.flags.pushNotificationsEnabled;
  }

  public isStrictJumpRejectionEnabled(): boolean {
    return this.flags.strictJumpRejection;
  }

  public isDebouncedPersistenceEnabled(): boolean {
    return this.flags.debouncedPersistenceEnabled;
  }

  public updateFlags(partial: Partial<TrackingFeatureFlagsConfig>): void {
    this.flags = { ...this.flags, ...partial };
    this.logger.log(`[FeatureFlagsUpdated] Updated: ${JSON.stringify(partial)}`);
  }
}
