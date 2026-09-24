export interface GeofenceCheckResult {
    isWithinGeofence: boolean;
    distanceMeters: number;
    hasTriggeredArrival: boolean;
    state: 'APPROACHING' | 'ENTERED' | 'OUTSIDE';
}
export declare class GeofenceService {
    private readonly logger;
    private readonly ENTRY_RADIUS_METERS;
    private readonly EXIT_RADIUS_METERS;
    private readonly geofenceStates;
    private readonly arrivalTriggeredBookings;
    calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number;
    evaluateArrivalGeofence(bookingId: string, partnerLat: number, partnerLon: number, customerLat: number, customerLon: number): GeofenceCheckResult;
    markArrived(bookingId: string): void;
    hasArrived(bookingId: string): boolean;
    clearBookingGeofence(bookingId: string): void;
    private toRadians;
}
