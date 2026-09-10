/**
 * SERVENTICA — Routing & Location Engine Types (SERV-02)
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type TravelProfile = 'DRIVING' | 'WALKING' | 'CYCLING';

export type OriginType =
  | 'STORE'
  | 'PARTNER'
  | 'PROVIDER'
  | 'HUB'
  | 'WAREHOUSE';

export interface ServiceOrigin {
  id: string;
  name: string;
  type: OriginType;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isActive: boolean;
  priority?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RouteRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  profile?: TravelProfile;
  alternatives?: boolean;
  geometry?: boolean;
}

export type RoutingProviderName = 'OSRM' | 'MAPBOX' | 'GOOGLE';

export type ETAQuality = 'STATIC' | 'HISTORICAL_TRAFFIC' | 'LIVE_TRAFFIC';

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds?: number;
  origin: GeoPoint;
  destination: GeoPoint;
  provider: RoutingProviderName;
  calculatedAt: string;
  routeId?: string;
  geometry?: unknown;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MatrixRequest {
  origins: GeoPoint[];
  destinations: GeoPoint[];
  profile?: TravelProfile;
}

export interface MatrixCell {
  originIndex: number;
  destinationIndex: number;
  distanceMeters: number;
  durationSeconds: number;
}

export interface MatrixResult {
  durations: number[][];
  distances: number[][];
}

export interface ETAResult {
  durationSeconds: number;
  durationMinutes: number;
  distanceMeters: number;
  distanceKm: number;
  estimatedArrivalAt?: string;
  source: 'ROUTING_ENGINE' | 'CACHE' | 'FALLBACK';
  calculatedAt: string;
  originId: string;
  destination: GeoPoint;
  etaQuality: ETAQuality;
  formattedETA: string;
  formattedDistance?: string;
}

export type RoutingErrorType =
  | 'INVALID_COORDINATES'
  | 'NO_ROUTE'
  | 'ROUTING_PROVIDER_UNAVAILABLE'
  | 'ROUTING_TIMEOUT'
  | 'ROUTING_RATE_LIMITED'
  | 'ORIGIN_UNAVAILABLE'
  | 'DESTINATION_UNSERVICEABLE';
