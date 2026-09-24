/**
 * SERVENTICA — Canonical Tracking Domain Contracts (SERV-03)
 * Decoupled, production-ready types for live tracking sessions,
 * high-frequency GPS events, Socket.IO rooms, and snapshot payloads.
 */

import { GeoPoint } from './routing.types';
import { BookingPartner } from './account.types';
import { BookingStatus } from './index';

export type TrackingStatus =
  | 'NOT_AVAILABLE'
  | 'SEARCHING_PARTNER'
  | 'PARTNER_ASSIGNED'
  | 'WAITING_FOR_FIRST_LOCATION'
  | 'LIVE'
  | 'STALE'
  | 'RECONNECTING'
  | 'ARRIVED'
  | 'SERVICE_STARTED'
  | 'SERVICE_COMPLETED'
  | 'CANCELLED';

/**
 * Fixed customer destination where service will take place
 */
export interface ServiceLocationSnapshot {
  addressId: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  shortAddress: string;
  landmark?: string | null;
  city: string;
  state?: string;
  pincode?: string;
  placeId?: string;
}

/**
 * Physical partner GPS coordinate broadcast
 */
export interface PartnerLiveLocation {
  bookingId: string;
  partnerId: string;
  latitude: number;
  longitude: number;
  accuracy?: number; // In meters
  heading?: number;  // 0 - 360 degrees
  speed?: number;    // m/s
  altitude?: number;
  timestamp: string; // ISO 8601 UTC
  isMocked?: boolean;
}

/**
 * Ephemeral connection state for realtime websocket/socket.io
 */
export type TrackingConnectionState = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

/**
 * Complete consolidated tracking state consumed by map and detail screens
 */
export interface TrackingSessionState {
  bookingId: string;
  trackingStatus: TrackingStatus;
  partner: BookingPartner | null;
  partnerLocation: PartnerLiveLocation | null;
  customerLocation: GeoPoint;
  routeCoordinates: GeoPoint[];
  distanceMeters: number;
  durationSeconds: number;
  etaText: string;
  distanceText: string;
  lastLocationAt: string | null;
  isLive: boolean;
  connectionState: TrackingConnectionState;
}

/**
 * Authoritative initial snapshot payload delivered upon room join or HTTP fetch
 */
export interface TrackingSnapshotPayload {
  bookingId: string;
  bookingNumber: string;
  bookingStatus: BookingStatus;
  trackingStatus: TrackingStatus;
  customerLocation: ServiceLocationSnapshot;
  partner: BookingPartner | null;
  lastKnownPartnerLocation: PartnerLiveLocation | null;
  routeCoordinates: GeoPoint[];
  encodedPolyline?: string;
  distanceMeters: number;
  durationSeconds: number;
  etaText: string;
  distanceText: string;
  lastLocationAt: string | null;
  serverTimestamp: string;
}

/**
 * Typed Socket.IO Room Event Payloads
 */
export interface SocketTrackingEvents {
  // Client -> Server
  'tracking:join': { bookingId: string; clientRole: 'CUSTOMER' | 'PARTNER'; token?: string };
  'partner:location': PartnerLiveLocation;

  // Server -> Client
  'tracking:snapshot': TrackingSnapshotPayload;
  'tracking:location': PartnerLiveLocation;
  'tracking:status': { bookingId: string; status: TrackingStatus; timestamp: string };
  'tracking:eta': { bookingId: string; durationMinutes: number; distanceKm: number; etaText: string; distanceText: string; polyline?: string };
  'tracking:arrival': { bookingId: string; arrivedAt: string };
  'tracking:service-started': { bookingId: string; startedAt: string };
  'tracking:completed': { bookingId: string; completedAt: string };
  'tracking:error': { code: string; message: string; details?: unknown };
}
