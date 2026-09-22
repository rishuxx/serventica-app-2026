import { RoutingProvider } from './RoutingProvider';
import {
  RouteRequest,
  RouteResult,
  MatrixRequest,
  MatrixResult,
  GeoPoint,
} from '../../types/routing.types';
import { ServenticaEnvironment } from '../../../../../packages/config/src';

export class GoogleRoutingProvider implements RoutingProvider {
  private readonly baseUrl: string = 'https://maps.googleapis.com/maps/api/directions/json';
  private readonly matrixUrl: string = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  private apiKey: string;
  private readonly timeoutMs: number;

  constructor(apiKey?: string, timeoutMs = 6000) {
    this.apiKey =
      apiKey ||
      process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ServenticaEnvironment?.googleMaps?.apiKey ||
      'AIzaSyAasVoqGTlhp66ydhb7sLMBLHRr36awF6g';
    this.timeoutMs = timeoutMs;
  }

  private validateCoordinates(point: GeoPoint, name: string): void {
    if (!point || typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
      throw new Error(`Invalid coordinates for ${name}: values must be numeric.`);
    }
  }

  async calculateRoute(request: RouteRequest): Promise<RouteResult> {
    this.validateCoordinates(request.origin, 'origin');
    this.validateCoordinates(request.destination, 'destination');

    const profile = (request.profile || 'DRIVING').toLowerCase();
    const mode = profile === 'walking' ? 'walking' : profile === 'cycling' ? 'bicycling' : 'driving';
    const originStr = `${request.origin.latitude},${request.origin.longitude}`;
    const destStr = `${request.destination.latitude},${request.destination.longitude}`;

    const url = `${this.baseUrl}?origin=${originStr}&destination=${destStr}&mode=${mode}&key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal as any,
      });

      if (!res.ok) {
        throw new Error(`Google Directions HTTP error status ${res.status}`);
      }

      const data: any = await res.json();
      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        throw new Error(`Google Directions failed with status: ${data.code || data.status || 'NO_ROUTE'}`);
      }

      const route = data.routes[0];
      const leg = route.legs?.[0];
      const encodedPolyline = route.overview_polyline?.points;
      const decodedCoordinates = encodedPolyline ? this.decodePolyline(encodedPolyline) : undefined;

      return {
        distanceMeters: leg?.distance?.value || 0,
        durationSeconds: leg?.duration?.value || 0,
        staticDurationSeconds: leg?.duration?.value || 0,
        origin: request.origin,
        destination: request.destination,
        provider: 'GOOGLE',
        calculatedAt: new Date().toISOString(),
        geometry: encodedPolyline,
        coordinates: decodedCoordinates,
        confidence: 'HIGH',
      };
    } catch (err: any) {
      console.warn('Google route calculation failed, using straight-line fallback:', err);
      const distMeters = Math.round(this.calculateHaversine(request.origin, request.destination) * 1000);
      const durSecs = Math.max(120, Math.round((distMeters / 1000 / 25) * 3600));

      return {
        distanceMeters: distMeters,
        durationSeconds: durSecs,
        origin: request.origin,
        destination: request.destination,
        provider: 'GOOGLE',
        calculatedAt: new Date().toISOString(),
        coordinates: [request.origin, request.destination],
        confidence: 'LOW',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async calculateMatrix(request: MatrixRequest): Promise<MatrixResult> {
    if (!request.origins.length || !request.destinations.length) {
      throw new Error('Origins and destinations must not be empty.');
    }

    const originsStr = request.origins.map((o) => `${o.latitude},${o.longitude}`).join('|');
    const destsStr = request.destinations.map((d) => `${d.latitude},${d.longitude}`).join('|');

    const url = `${this.matrixUrl}?origins=${originsStr}&destinations=${destsStr}&mode=driving&key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal as any,
      });

      if (!res.ok) {
        throw new Error(`Google Matrix HTTP error: ${res.status}`);
      }

      const data: any = await res.json();
      if (data.status !== 'OK') {
        throw new Error(`Google Matrix API returned: ${data.status}`);
      }

      const distances: number[][] = [];
      const durations: number[][] = [];

      for (const row of data.rows || []) {
        const rowDists: number[] = [];
        const rowDurs: number[] = [];
        for (const elem of row.elements || []) {
          if (elem.status === 'OK') {
            rowDists.push(elem.distance?.value || 0);
            rowDurs.push(elem.duration?.value || 0);
          } else {
            rowDists.push(0);
            rowDurs.push(0);
          }
        }
        distances.push(rowDists);
        durations.push(rowDurs);
      }

      return {
        durations,
        distances,
      };
    } catch (err: any) {
      console.warn('Google Matrix calculation failed, using fallback:', err);
      const distances = request.origins.map((o) =>
        request.destinations.map((d) => Math.round(this.calculateHaversine(o, d) * 1000))
      );
      const durations = distances.map((row) =>
        row.map((d) => Math.max(120, Math.round((d / 1000 / 25) * 3600)))
      );

      return {
        durations,
        distances,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private calculateHaversine(c1: GeoPoint, c2: GeoPoint): number {
    const R = 6371;
    const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
    const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((c1.latitude * Math.PI) / 180) *
        Math.cos((c2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c * 1.3).toFixed(2));
  }

  /**
   * Decodes Google Maps Encoded Polyline algorithm into array of lat/lng coordinates
   */
  public decodePolyline(encoded: string): GeoPoint[] {
    const points: GeoPoint[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }
}
