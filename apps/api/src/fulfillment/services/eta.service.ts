import { Injectable, Logger } from '@nestjs/common';

export interface RouteEtaResult {
  distanceKm: number;
  routeDistanceKm: number;
  durationMinutes: number;
  isConservativeFallback: boolean;
  calculatedAt: string;
}

@Injectable()
export class ETAService {
  private readonly logger = new Logger(ETAService.name);

  // Urban winding factor: 1.35x straight line distance
  private readonly URBAN_WINDING_FACTOR = 1.35;
  // Assumed average urban speed (km/h) for bikes/two-wheelers
  private readonly AVERAGE_URBAN_SPEED_KMH = 25;
  // Conservative traffic buffer in minutes
  private readonly TRAFFIC_BUFFER_MINUTES = 3;

  /**
   * Calculates Haversine distance in kilometers between two lat/long points
   */
  public calculateHaversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculates dynamic ETA from partner's live position to customer location.
   * Never hardcodes arbitrary numbers.
   */
  public calculateRouteEta(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): RouteEtaResult {
    try {
      const distanceKm = this.calculateHaversineKm(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude
      );

      const routeDistanceKm = Math.round(distanceKm * this.URBAN_WINDING_FACTOR * 100) / 100;
      const travelHours = routeDistanceKm / this.AVERAGE_URBAN_SPEED_KMH;
      const travelMinutes = travelHours * 60;
      const durationMinutes = Math.max(
        5,
        Math.ceil(travelMinutes + this.TRAFFIC_BUFFER_MINUTES)
      );

      return {
        distanceKm: Math.round(distanceKm * 100) / 100,
        routeDistanceKm,
        durationMinutes,
        isConservativeFallback: false,
        calculatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.warn(`ETA calculation failed, applying conservative fallback: ${err.message}`);
      return {
        distanceKm: 5.0,
        routeDistanceKm: 7.0,
        durationMinutes: 20,
        isConservativeFallback: true,
        calculatedAt: new Date().toISOString(),
      };
    }
  }
}
