import { RoutingProvider } from './RoutingProvider';
import {
  RouteRequest,
  RouteResult,
  MatrixRequest,
  MatrixResult,
  GeoPoint,
} from '../../types/routing.types';

export class OSRMRoutingProvider implements RoutingProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(baseUrl = 'https://router.project-osrm.org', timeoutMs = 6000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  private validateCoordinates(point: GeoPoint, name: string): void {
    if (!point || typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
      throw new Error(`Invalid coordinates for ${name}: values must be numeric.`);
    }
    if (isNaN(point.latitude) || isNaN(point.longitude) || !isFinite(point.latitude) || !isFinite(point.longitude)) {
      throw new Error(`Invalid coordinates for ${name}: NaN or Infinity detected.`);
    }
    if (point.latitude < -90 || point.latitude > 90) {
      throw new Error(`Latitude out of range [-90, 90] for ${name}: ${point.latitude}`);
    }
    if (point.longitude < -180 || point.longitude > 180) {
      throw new Error(`Longitude out of range [-180, 180] for ${name}: ${point.longitude}`);
    }
  }

  async calculateRoute(request: RouteRequest): Promise<RouteResult> {
    this.validateCoordinates(request.origin, 'origin');
    this.validateCoordinates(request.destination, 'destination');

    const profile = (request.profile || 'DRIVING').toLowerCase();
    const osrmProfile = profile === 'walking' ? 'foot' : profile === 'cycling' ? 'bicycle' : 'driving';

    // OSRM requires: /route/v1/{profile}/{lon1},{lat1};{lon2},{lat2}?overview=false
    const originStr = `${request.origin.longitude},${request.origin.latitude}`;
    const destStr = `${request.destination.longitude},${request.destination.latitude}`;
    const url = `${this.baseUrl}/route/v1/${osrmProfile}/${originStr};${destStr}?overview=false&alternatives=${!!request.alternatives}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Serventica-Mobile-App/1.0',
        },
        signal: controller.signal as any,
      });

      if (!res.ok) {
        throw new Error(`OSRM HTTP error status ${res.status}`);
      }

      const data: any = await res.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error(`OSRM routing failed with code: ${data.code || 'NO_ROUTE'}`);
      }

      const primaryRoute = data.routes[0];
      return {
        distanceMeters: Math.round(primaryRoute.distance || 0),
        durationSeconds: Math.round(primaryRoute.duration || 0),
        staticDurationSeconds: Math.round(primaryRoute.duration || 0),
        origin: request.origin,
        destination: request.destination,
        provider: 'OSRM',
        calculatedAt: new Date().toISOString(),
        confidence: 'HIGH',
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Routing request timed out.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async calculateMatrix(request: MatrixRequest): Promise<MatrixResult> {
    if (!request.origins.length || !request.destinations.length) {
      return { durations: [], distances: [] };
    }

    request.origins.forEach((o: GeoPoint, i: number) => this.validateCoordinates(o, `origin[${i}]`));
    request.destinations.forEach((d: GeoPoint, i: number) => this.validateCoordinates(d, `destination[${i}]`));

    const allCoords = [...request.origins, ...request.destinations];
    const coordsStr = allCoords.map((c: GeoPoint) => `${c.longitude},${c.latitude}`).join(';');
    const sources = request.origins.map((_: GeoPoint, i: number) => i).join(';');
    const destinations = request.destinations.map((_: GeoPoint, i: number) => request.origins.length + i).join(';');

    const url = `${this.baseUrl}/table/v1/driving/${coordsStr}?sources=${sources}&destinations=${destinations}&annotations=duration,distance`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal as any,
      });

      const data: any = await res.json();
      if (data.code !== 'Ok') {
        throw new Error(`OSRM Table API returned: ${data.code}`);
      }

      return {
        durations: data.durations || [],
        distances: data.distances || [],
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
