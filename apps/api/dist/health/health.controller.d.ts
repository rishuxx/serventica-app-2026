import { TrackingSessionService } from '../tracking/tracking-session.service';
import { TrackingFeatureFlagsService } from '../tracking/tracking-feature-flags.service';
export declare class HealthController {
    private readonly trackingSessionService;
    private readonly featureFlagsService;
    constructor(trackingSessionService: TrackingSessionService, featureFlagsService: TrackingFeatureFlagsService);
    getHealth(): {
        status: string;
        timestamp: string;
        service: string;
    };
    getReady(): {
        status: string;
        database: string;
        socket: string;
        timestamp: string;
    };
    getTrackingHealth(): {
        status: string;
        metrics: {
            activeTrackingSessions: number;
            activePartners: number;
            evictedSessionsCount: number;
            sessionsByStatus: Record<string, number>;
        };
        featureFlags: import("../tracking/tracking-feature-flags.service").TrackingFeatureFlagsConfig;
        timestamp: string;
    };
}
