import { RouteResult, GeoPoint, TravelProfile } from '../../types/routing.types';

export interface RouteCache {
  get(origin: GeoPoint, destination: GeoPoint, profile: TravelProfile): Promise<RouteResult | null>;
  set(origin: GeoPoint, destination: GeoPoint, profile: TravelProfile, result: RouteResult, ttlSeconds?: number): Promise<void>;
  clear(): void;
}

interface CacheEntry {
  result: RouteResult;
  expiresAt: number;
}

/**
 * In-Memory Normalized Route Cache
 * Normalizes coordinates to ~11m precision (4 decimal places) to maximize cache hits
 * while preventing redundant HTTP calls to OSRM / routing providers.
 */
export class InMemoryRouteCache implements RouteCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlSeconds = 600) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  private generateKey(origin: GeoPoint, destination: GeoPoint, profile: TravelProfile): string {
    const oLat = origin.latitude.toFixed(4);
    const oLng = origin.longitude.toFixed(4);
    const dLat = destination.latitude.toFixed(4);
    const dLng = destination.longitude.toFixed(4);
    return `${oLat},${oLng}->${dLat},${dLng}:${profile}`;
  }

  async get(origin: GeoPoint, destination: GeoPoint, profile: TravelProfile): Promise<RouteResult | null> {
    const key = this.generateKey(origin, destination, profile);
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.result;
  }

  async set(
    origin: GeoPoint,
    destination: GeoPoint,
    profile: TravelProfile,
    result: RouteResult,
    ttlSeconds?: number
  ): Promise<void> {
    const key = this.generateKey(origin, destination, profile);
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    this.store.set(key, {
      result,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export const routeCache = new InMemoryRouteCache();
