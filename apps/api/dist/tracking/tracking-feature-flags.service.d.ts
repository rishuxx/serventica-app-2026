export interface TrackingFeatureFlagsConfig {
    geofenceArrivalEnabled: boolean;
    pushNotificationsEnabled: boolean;
    strictJumpRejection: boolean;
    debouncedPersistenceEnabled: boolean;
    maxAccuracyMeters: number;
}
export declare class TrackingFeatureFlagsService {
    private readonly logger;
    private flags;
    getFlags(): TrackingFeatureFlagsConfig;
    isGeofenceArrivalEnabled(): boolean;
    isPushNotificationsEnabled(): boolean;
    isStrictJumpRejectionEnabled(): boolean;
    isDebouncedPersistenceEnabled(): boolean;
    updateFlags(partial: Partial<TrackingFeatureFlagsConfig>): void;
}
