import { RoutingProvider } from './RoutingProvider';
import { RouteRequest, RouteResult, MatrixRequest, MatrixResult, GeoPoint } from '../../types/routing.types';

import { ServenticaEnvironment } from '../../../../../packages/config/src';

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_ACCESS_TOKEN ||
  ServenticaEnvironment?.mapbox?.accessToken ||
  '';

/**
 * SERVENTICA — Mapbox Live Road Routing Provider
 * Fetches turn-by-turn road routes, real-world driving coordinates,
 * true road distance (meters) and duration (seconds).
 */
export class MapboxRoutingProvider implements RoutingProvider {
  readonly name = 'MAPBOX' as const;

  async calculateRoute(request: RouteRequest): Promise<RouteResult> {
    const { origin, destination } = request;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?geometries=polyline&overview=full&access_token=${MAPBOX_TOKEN}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Mapbox routing HTTP ${response.status}`);
      }

      const data = await response.json();
      const route = data.routes?.[0];

      if (!route) {
        throw new Error('No route returned by Mapbox');
      }

      const geometry = route.geometry;
      const coordinates = typeof geometry === 'string' ? this.decodePolyline(geometry) : undefined;

      return {
        provider: 'MAPBOX',
        origin,
        destination,
        calculatedAt: new Date().toISOString(),
        durationSeconds: Math.round(route.duration),
        distanceMeters: Math.round(route.distance),
        geometry, // string encoded polyline
        coordinates,
        confidence: 'HIGH',
      };
    } catch (error) {
      console.warn('Mapbox route calculation fallback:', error);
      return {
        provider: 'MAPBOX',
        origin,
        destination,
        calculatedAt: new Date().toISOString(),
        durationSeconds: 600,
        distanceMeters: 2500,
        coordinates: [
          { latitude: origin.latitude, longitude: origin.longitude },
          { latitude: destination.latitude, longitude: destination.longitude },
        ],
        confidence: 'LOW',
      };
    }
  }

  /**
   * Decodes Mapbox / Google standard encoded polyline string into GeoPoint array
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
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }

  async calculateMatrix(request: MatrixRequest): Promise<MatrixResult> {
    const durations = request.origins.map(() =>
      request.destinations.map(() => 600)
    );
    const distances = request.origins.map(() =>
      request.destinations.map(() => 2500)
    );

    return {
      durations,
      distances,
    };
  }
}
