import { Injectable, Logger } from '@nestjs/common';

export interface GeofenceCheckResult {
  isWithinGeofence: boolean;
  distanceMeters: number;
  hasTriggeredArrival: boolean;
  state: 'APPROACHING' | 'ENTERED' | 'OUTSIDE';
}

@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);

  // Arrival entry radius: <= 50 meters
  private readonly ENTRY_RADIUS_METERS = 50.0;
  // Hysteresis exit radius: > 75 meters (prevents oscillation on boundary)
  private readonly EXIT_RADIUS_METERS = 75.0;

  // In-memory geofence state tracker per booking: bookingId -> boolean (isCurrentlyInside)
  private readonly geofenceStates: Map<string, boolean> = new Map();
  // Arrival recorded set to guarantee idempotency in-memory
  private readonly arrivalTriggeredBookings: Set<string> = new Set();

  /**
   * Calculates precise geographic distance between two coordinates using the Haversine formula
   */
  public calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Evaluates partner position against customer service location with hysteresis.
   */
  public evaluateArrivalGeofence(
    bookingId: string,
    partnerLat: number,
    partnerLon: number,
    customerLat: number,
    customerLon: number
  ): GeofenceCheckResult {
    const distanceMeters = this.calculateDistanceMeters(
      partnerLat,
      partnerLon,
      customerLat,
      customerLon
    );

    const isCurrentlyInside = this.geofenceStates.get(bookingId) || false;
    let newInsideState = isCurrentlyInside;
    let state: 'APPROACHING' | 'ENTERED' | 'OUTSIDE' = 'APPROACHING';

    if (!isCurrentlyInside && distanceMeters <= this.ENTRY_RADIUS_METERS) {
      newInsideState = true;
      state = 'ENTERED';
      this.logger.log(
        `[GeofenceEntry] Booking ${bookingId}: Partner entered arrival geofence (${distanceMeters.toFixed(1)}m <= ${this.ENTRY_RADIUS_METERS}m)`
      );
    } else if (isCurrentlyInside && distanceMeters > this.EXIT_RADIUS_METERS) {
      newInsideState = false;
      state = 'OUTSIDE';
      this.logger.log(
        `[GeofenceExit] Booking ${bookingId}: Partner exited geofence boundary (${distanceMeters.toFixed(1)}m > ${this.EXIT_RADIUS_METERS}m)`
      );
    } else if (isCurrentlyInside) {
      state = 'ENTERED';
    }

    this.geofenceStates.set(bookingId, newInsideState);

    // Determine if arrival should be triggered
    let hasTriggeredArrival = false;
    if (newInsideState && !this.arrivalTriggeredBookings.has(bookingId)) {
      this.arrivalTriggeredBookings.add(bookingId);
      hasTriggeredArrival = true;
    }

    return {
      isWithinGeofence: newInsideState,
      distanceMeters,
      hasTriggeredArrival,
      state,
    };
  }

  /**
   * Marks booking as arrived (idempotent)
   */
  public markArrived(bookingId: string): void {
    this.arrivalTriggeredBookings.add(bookingId);
    this.geofenceStates.set(bookingId, true);
  }

  /**
   * Checks if booking has already triggered arrival
   */
  public hasArrived(bookingId: string): boolean {
    return this.arrivalTriggeredBookings.has(bookingId);
  }

  /**
   * Cleans up geofence state when a session completes or cancels
   */
  public clearBookingGeofence(bookingId: string): void {
    this.geofenceStates.delete(bookingId);
    this.arrivalTriggeredBookings.delete(bookingId);
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
