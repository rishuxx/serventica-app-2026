import { supabase } from '../../../lib/supabase/client';
import { CartItem } from '../domain/Cart';

export interface CartPayload {
  items: Record<string, CartItem>;
  updatedAt: string;
  deviceOrigin: string;
}

export type CartSyncCallback = (items: Record<string, CartItem>) => void;

/**
 * CartCloudSyncService
 * Multi-Device Realtime Cart Synchronization
 * Uses Supabase Realtime Channels (Broadcast) + Customer Profiles Table backup.
 */
export class CartCloudSyncService {
  private activeChannel: any = null;
  private currentUserId: string | null = null;
  private deviceId: string = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  private syncCallback: CartSyncCallback | null = null;

  /**
   * Subscribe to real-time cart updates for the authenticated user
   */
  subscribe(userId: string, onRemoteCartUpdate: CartSyncCallback) {
    this.syncCallback = onRemoteCartUpdate;

    if (this.currentUserId === userId && this.activeChannel) {
      return;
    }

    this.unsubscribe();
    this.currentUserId = userId;

    // 1. Initial pull from customer_profiles table or user session
    this.pullLatestCart(userId).then((cloudItems) => {
      if (cloudItems && Object.keys(cloudItems).length > 0) {
        onRemoteCartUpdate(cloudItems);
      }
    });

    // 2. Realtime WebSocket channel for cross-device broadcast
    const channelName = `cart_channel_${userId}`;
    this.activeChannel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false, // Do not echo back to sender
          ack: true,
        },
      },
    });

    this.activeChannel
      .on('broadcast', { event: 'CART_UPDATED' }, (payload: { payload?: CartPayload }) => {
        if (payload?.payload?.items && payload.payload.deviceOrigin !== this.deviceId) {
          onRemoteCartUpdate(payload.payload.items);
        }
      })
      .subscribe();
  }

  /**
   * Broadcast local cart modifications to all other logged-in devices
   */
  async broadcastCartChange(items: Record<string, CartItem>) {
    if (!this.currentUserId) return;

    const payload: CartPayload = {
      items,
      updatedAt: new Date().toISOString(),
      deviceOrigin: this.deviceId,
    };

    try {
      // 1. Send Realtime WebSocket Broadcast
      if (this.activeChannel) {
        this.activeChannel.send({
          type: 'broadcast',
          event: 'CART_UPDATED',
          payload,
        });
      }

      // 2. Persist to customer_profiles table if available
      supabase
        .from('customer_profiles')
        .update({
          synced_cart: items,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', this.currentUserId)
        .then(() => {})
        .catch(() => {});
    } catch (err) {
      console.warn('[CartCloudSyncService] broadcast error:', err);
    }
  }

  /**
   * Fetch persisted cloud cart when signing in or launching on a new device
   */
  async pullLatestCart(userId: string): Promise<Record<string, CartItem> | null> {
    try {
      const { data } = await supabase
        .from('customer_profiles')
        .select('synced_cart')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && (data as any).synced_cart) {
        return (data as any).synced_cart as Record<string, CartItem>;
      }
    } catch (e) {
      // Non-blocking fallback
    }
    return null;
  }

  /**
   * Unsubscribe on logout or component unmount
   */
  unsubscribe() {
    if (this.activeChannel) {
      supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }
    this.currentUserId = null;
    this.syncCallback = null;
  }
}

export const cartCloudSyncService = new CartCloudSyncService();
