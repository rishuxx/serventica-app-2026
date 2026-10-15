/**
 * SERVENTICA — Live Tracking Service (SERV-03)
 * Authoritative client manager for Realtime Partner GPS Broadcasts,
 * Location Validation, and Booking Tracking Channels.
 */

import { supabase } from '../lib/supabase/client';
import { PartnerLiveLocation, TrackingStatus } from '../types/tracking.types';
import { SafeAsyncStorage as AsyncStorage } from '../../../../packages/utils/src/storage/safe-storage';

type LocationListener = (location: PartnerLiveLocation) => void;
type StatusListener = (status: TrackingStatus) => void;

class LiveTrackingService {
  private activeChannels: Map<string, any> = new Map();
  private locationListeners: Map<string, Set<LocationListener>> = new Map();
  private statusListeners: Map<string, Set<StatusListener>> = new Map();
  private lastKnownLocations: Map<string, PartnerLiveLocation> = new Map();
  private lastBroadcastTimestamps: Map<string, number> = new Map();

  // Rate-limiting threshold: max 1 broadcast every 800ms per booking
  private readonly MIN_BROADCAST_INTERVAL_MS = 800;

  /**
   * Geographic & freshness validation for partner coordinates
   */
  public validateLocation(payload: Partial<PartnerLiveLocation>): { isValid: boolean; reason?: string } {
    if (payload.latitude == null || payload.longitude == null) {
      return { isValid: false, reason: 'MISSING_COORDINATES' };
    }

    if (
      typeof payload.latitude !== 'number' ||
      typeof payload.longitude !== 'number' ||
      isNaN(payload.latitude) ||
      isNaN(payload.longitude)
    ) {
      return { isValid: false, reason: 'NON_NUMERIC_COORDINATES' };
    }

    if (payload.latitude < -90 || payload.latitude > 90) {
      return { isValid: false, reason: 'LATITUDE_OUT_OF_BOUNDS' };
    }

    if (payload.longitude < -180 || payload.longitude > 180) {
      return { isValid: false, reason: 'LONGITUDE_OUT_OF_BOUNDS' };
    }

    if (payload.accuracy != null && (payload.accuracy < 0 || payload.accuracy > 500)) {
      // Inaccurate GPS reading (> 500m error margin)
      return { isValid: false, reason: 'INACCURATE_GPS_READING' };
    }

    return { isValid: true };
  }

  /**
   * Publish partner location update over Supabase Realtime channel and update latest cache
   */
  public async publishPartnerLocation(location: PartnerLiveLocation): Promise<{ success: boolean; error?: string }> {
    const validation = this.validateLocation(location);
    if (!validation.isValid) {
      console.warn('[LiveTrackingService] Rejected invalid GPS update:', validation.reason, location);
      return { success: false, error: validation.reason };
    }

    const { bookingId } = location;
    if (!bookingId) {
      return { success: false, error: 'MISSING_BOOKING_ID' };
    }

    const now = Date.now();
    const lastBroadcast = this.lastBroadcastTimestamps.get(bookingId) || 0;
    if (now - lastBroadcast < this.MIN_BROADCAST_INTERVAL_MS) {
      // Throttle excessive calls, but keep latest memory state
      this.lastKnownLocations.set(bookingId, location);
      return { success: true };
    }

    this.lastBroadcastTimestamps.set(bookingId, now);
    this.lastKnownLocations.set(bookingId, location);

    // Persist locally for instant recovery
    AsyncStorage.setItem(`@serventica_live_loc_${bookingId}`, JSON.stringify(location)).catch(() => {});

    // Notify local listeners (if running on same app instance)
    const listeners = this.locationListeners.get(bookingId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(location);
        } catch (e) {}
      });
    }

    // Broadcast over Supabase Realtime Channel
    try {
      const channelName = `order_${bookingId}_tracking`;
      let channel = this.activeChannels.get(channelName);

      if (!channel) {
        channel = supabase.channel(channelName, {
          config: { broadcast: { self: true, ack: true } },
        });
        channel.subscribe();
        this.activeChannels.set(channelName, channel);
      }

      console.log('[DEBUG-SEND] LiveTrackingService.publishPartnerLocation for bookingId:', bookingId);
      await channel.send({
        type: 'broadcast',
        event: 'PARTNER_LOCATION_UPDATE',
        payload: location,
      });

      return { success: true };
    } catch (err: any) {
      console.warn('[LiveTrackingService] Broadcast error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Broadcast order status update (PARTNER_ACCEPTED, EN_ROUTE, ARRIVED, STARTED, COMPLETED, CANCELLED)
   */
  public async publishTrackingStatus(
    bookingId: string,
    status: TrackingStatus | string,
    bookingNumber?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!bookingId) return { success: false, error: 'MISSING_BOOKING_ID' };

    const channelNames = new Set<string>();
    channelNames.add(`order_${bookingId}_tracking`);
    if (bookingNumber) {
      channelNames.add(`order_${bookingNumber}_tracking`);
    }

    // Notify local listeners
    const listeners = this.statusListeners.get(bookingId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(status as TrackingStatus);
        } catch (e) {}
      });
    }

    try {
      for (const chName of channelNames) {
        let ch = this.activeChannels.get(chName);
        if (!ch) {
          ch = supabase.channel(chName, {
            config: { broadcast: { self: true, ack: true } },
          });
          ch.subscribe();
          this.activeChannels.set(chName, ch);
        }
        await ch.send({
          type: 'broadcast',
          event: 'TRACKING_STATUS_UPDATE',
          payload: { status, bookingId, bookingNumber, timestamp: Date.now() },
        });
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[LiveTrackingService] publishTrackingStatus error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Subscribe customer screen to live partner location updates for a specific booking
   */
  public subscribeToBookingTracking(
    bookingId: string,
    onLocationUpdate: LocationListener,
    onStatusUpdate?: StatusListener,
    bookingNumber?: string
  ): () => void {
    if (!bookingId) return () => {};

    const cleanId = bookingId.trim();
    const cleanNumber = bookingNumber?.trim();
    const idsToTrack = new Set<string>();
    idsToTrack.add(cleanId);
    if (cleanNumber) idsToTrack.add(cleanNumber);

    // 1. Register listener in local map for all associated identifiers
    idsToTrack.forEach((id) => {
      if (!this.locationListeners.has(id)) {
        this.locationListeners.set(id, new Set());
      }
      this.locationListeners.get(id)!.add(onLocationUpdate);

      if (onStatusUpdate) {
        if (!this.statusListeners.has(id)) {
          this.statusListeners.set(id, new Set());
        }
        this.statusListeners.get(id)!.add(onStatusUpdate);
      }
    });

    // 2. Deliver last known location immediately if available
    const cachedLoc = this.lastKnownLocations.get(cleanId) || (cleanNumber ? this.lastKnownLocations.get(cleanNumber) : null);
    if (cachedLoc) {
      onLocationUpdate(cachedLoc);
    } else {
      AsyncStorage.getItem(`@serventica_live_loc_${cleanId}`).then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.latitude && parsed.longitude) {
              this.lastKnownLocations.set(cleanId, parsed);
              onLocationUpdate(parsed);
            }
          } catch (e) {}
        }
      });
    }

    // 3. Connect to Supabase Realtime channel(s) (dual-channel room for zero-mismatch)
    const channelNames = Array.from(idsToTrack).map((id) => `order_${id}_tracking`);
    channelNames.forEach((channelName) => {
      let channel = this.activeChannels.get(channelName);

      if (!channel) {
        channel = supabase.channel(channelName, {
          config: { broadcast: { self: true, ack: true } },
        });

        channel
          .on('broadcast', { event: 'PARTNER_LOCATION_UPDATE' }, (eventPayload: any) => {
            const loc = eventPayload?.payload as PartnerLiveLocation;
            if (loc && loc.latitude != null && loc.longitude != null) {
              const val = this.validateLocation(loc);
              if (val.isValid) {
                idsToTrack.forEach((id) => this.lastKnownLocations.set(id, loc));
                idsToTrack.forEach((id) => {
                  const set = this.locationListeners.get(id);
                  if (set) {
                    set.forEach((cb) => {
                      try {
                        cb(loc);
                      } catch (e) {}
                    });
                  }
                });
              }
            }
          })
          .on('broadcast', { event: 'TRACKING_STATUS_UPDATE' }, (eventPayload: any) => {
            const status = eventPayload?.payload?.status as TrackingStatus;
            if (status) {
              idsToTrack.forEach((id) => {
                const set = this.statusListeners.get(id);
                if (set) {
                  set.forEach((cb) => {
                    try {
                      cb(status);
                    } catch (e) {}
                  });
                }
              });
            }
          })
          .subscribe();

        this.activeChannels.set(channelName, channel);
      }
    });

    // 4. Return cleanup function
    return () => {
      idsToTrack.forEach((id) => {
        const locSet = this.locationListeners.get(id);
        if (locSet) {
          locSet.delete(onLocationUpdate);
          if (locSet.size === 0) {
            this.locationListeners.delete(id);
          }
        }

        if (onStatusUpdate) {
          const statSet = this.statusListeners.get(id);
          if (statSet) {
            statSet.delete(onStatusUpdate);
            if (statSet.size === 0) {
              this.statusListeners.delete(id);
            }
          }
        }
      });

      channelNames.forEach((channelName) => {
        const isStillNeeded = Array.from(idsToTrack).some(
          (id) => this.locationListeners.has(id) || this.statusListeners.has(id)
        );
        if (!isStillNeeded) {
          const ch = this.activeChannels.get(channelName);
          if (ch) {
            supabase.removeChannel(ch);
            this.activeChannels.delete(channelName);
          }
        }
      });
    };
  }

  /**
   * Get cached latest partner location
   */
  public getLastKnownLocation(bookingId: string): PartnerLiveLocation | null {
    return this.lastKnownLocations.get(bookingId) || null;
  }
}

export const liveTrackingService = new LiveTrackingService();
