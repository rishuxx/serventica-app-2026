import { PartnerLiveLocation, TrackingSnapshotPayload, TrackingStatus, ServiceLocationSnapshot, BookingStatus } from '@serventica/types';
import { LocationValidationService } from './location-validation.service';
import { GeofenceService } from './geofence.service';
import { PushNotificationService } from './push-notification.service';
import { TrackingFeatureFlagsService } from './tracking-feature-flags.service';
export interface AuthorizeResult {
    authorized: boolean;
    role?: 'CUSTOMER' | 'PARTNER';
    bookingId?: string;
    reason?: string;
}
export interface AuthenticatedUser {
    userId: string;
    role: 'CUSTOMER' | 'PARTNER' | 'ADMIN';
}
export declare class TrackingSessionService {
    private readonly validationService;
    private readonly geofenceService;
    private readonly pushNotificationService;
    private readonly featureFlagsService;
    private readonly logger;
    private readonly activeSessions;
    private readonly rateLimitBuckets;
    private readonly BUCKET_CAPACITY;
    private readonly REFILL_INTERVAL_MS;
    private evictedSessionsCount;
    constructor(validationService: LocationValidationService, geofenceService: GeofenceService, pushNotificationService: PushNotificationService, featureFlagsService: TrackingFeatureFlagsService);
    registerOrUpdateBooking(session: {
        bookingId: string;
        bookingNumber: string;
        bookingStatus: BookingStatus;
        trackingStatus: TrackingStatus;
        customerId: string;
        partnerId: string;
        partner: any;
        customerLocation: ServiceLocationSnapshot;
    }): void;
    authorizeRoomJoin(user: AuthenticatedUser, bookingId: string): AuthorizeResult;
    getTrackingSnapshot(bookingId: string): TrackingSnapshotPayload;
    processPartnerLocation(partnerId: string, rawLocation: Partial<PartnerLiveLocation>): {
        success: boolean;
        error?: string;
        sanitizedLocation?: PartnerLiveLocation;
        shouldPersistRecovery?: boolean;
        hasTriggeredArrival?: boolean;
    };
    updateStatus(bookingId: string, status: TrackingStatus): void;
    getMetrics(): {
        activeTrackingSessions: number;
        activePartners: number;
        evictedSessionsCount: number;
        sessionsByStatus: Record<string, number>;
    };
}
