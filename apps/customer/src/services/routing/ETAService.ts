import { RoutingProvider } from './RoutingProvider';
import { RoutingProviderFactory } from './RoutingProviderFactory';
import { OriginResolver, defaultOriginResolver } from './OriginResolver';
import { RouteCache, routeCache } from './RouteCache';
import {
  GeoPoint,
  TravelProfile,
  ETAResult,
  RouteResult,
  ETAQuality,
} from '../../types/routing.types';

export class ETAService {
  constructor(
    private readonly routingProvider: RoutingProvider = RoutingProviderFactory.getInstance().getProvider(),
    private readonly originResolver: OriginResolver = defaultOriginResolver,
    private readonly cache: RouteCache = routeCache
  ) {}

  /**
   * Presentation Formatter for Display Policy
   * Enforces a minimum operational floor of 5 minutes (realistic dispatch/partner arrival threshold).
   * For routes >= 5 mins, accurately displays the exact fetched road ETA duration.
   * Examples:
   *  37s (< 1 min) -> "5 minutes"
   *  180s (3 mins) -> "5 minutes"
   *  360s (6 mins) -> "6 minutes"
   *  2247s (37 mins) -> "37 minutes"
   */
  public formatETA(durationSeconds: number, fullWord = false): string {
    const rawMins = Math.round(durationSeconds / 60);
    const effectiveMins = Math.max(5, rawMins);
    return fullWord ? `${effectiveMins} minutes` : `${effectiveMins} mins`;
  }

  public formatDistance(distanceMeters: number): string {
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)} m`;
    }
    const km = (distanceMeters / 1000).toFixed(1);
    return `${km} km`;
  }

  /**
   * Orchestrates origin resolution, cached lookup, routing engine execution, and result normalization.
   */
  async calculateETA(
    destination: GeoPoint,
    profile: TravelProfile = 'DRIVING',
    purpose = 'CUSTOMER_HOME_ETA'
  ): Promise<ETAResult> {
    if (!destination || typeof destination.latitude !== 'number' || typeof destination.longitude !== 'number') {
      throw new Error('Destination coordinates must be provided and numeric.');
    }

    // 1. Resolve configured service origin
    const origin = await this.originResolver.resolveOrigin({ destination, purpose });
    const originPoint: GeoPoint = {
      latitude: origin.latitude,
      longitude: origin.longitude,
    };

    // 2. Check in-memory route cache
    const cachedRoute = await this.cache.get(originPoint, destination, profile);
    if (cachedRoute) {
      return this.mapRouteToETA(cachedRoute, origin.id, 'CACHE', 'STATIC');
    }

    // 3. Execute routing through provider
    const routeResult = await this.routingProvider.calculateRoute({
      origin: originPoint,
      destination,
      profile,
    });

    // 4. Save to cache (default 10 mins TTL)
    await this.cache.set(originPoint, destination, profile, routeResult, 600);

    // 5. Return domain ETA
    const etaQuality: ETAQuality = routeResult.provider === 'OSRM' ? 'STATIC' : 'LIVE_TRAFFIC';
    return this.mapRouteToETA(routeResult, origin.id, 'ROUTING_ENGINE', etaQuality);
  }

  private mapRouteToETA(
    route: RouteResult,
    originId: string,
    source: 'ROUTING_ENGINE' | 'CACHE' | 'FALLBACK',
    etaQuality: ETAQuality
  ): ETAResult {
    const durationSeconds = route.durationSeconds;
    const distanceMeters = route.distanceMeters;
    const rawMinutes = Math.round(durationSeconds / 60);
    const durationMinutes = Math.max(5, rawMinutes);
    const distanceKm = Number((distanceMeters / 1000).toFixed(2));

    const effectiveSeconds = Math.max(300, durationSeconds);
    const arrivalDate = new Date(Date.now() + effectiveSeconds * 1000);

    return {
      durationSeconds,
      durationMinutes,
      distanceMeters,
      distanceKm,
      estimatedArrivalAt: arrivalDate.toISOString(),
      source,
      calculatedAt: route.calculatedAt || new Date().toISOString(),
      originId,
      destination: route.destination,
      etaQuality,
      formattedETA: this.formatETA(durationSeconds, true),
      formattedDistance: this.formatDistance(distanceMeters),
      coordinates: route.coordinates,
    };
  }
}

export const etaService = new ETAService();
