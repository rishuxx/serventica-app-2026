/**
 * SERVENTICA — Tracking & Live Location Types (SERV-03)
 */

import { GeoPoint } from './routing.types';
import { BookingPartner, BookingStatus } from '../../../../packages/types/src';

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

export interface PartnerLiveLocation {
  bookingId: string;
  partnerId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: string; // ISO 8601
}

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
  connectionState: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
}
