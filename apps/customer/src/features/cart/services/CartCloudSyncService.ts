import { supabase } from '../../../lib/supabase/client';
import { CartItem } from '../domain/Cart';

export interface CartPayload {
  items: Record<string, CartItem>;
  updatedAt: string;
  deviceOrigin?: string;
}

export type CartSyncCallback = (items: Record<string, CartItem>) => void;

/**
 * CartCloudSyncService
 * Realtime multi-device cart sync using Supabase Realtime Broadcast & Database Sync.
 * When a user logs in with the same account on multiple devices:
 * 1. Listening to Realtime Broadcast updates cart immediately across all active devices (<50ms).
 * 2. Emits changes when user adds/removes items.
 * 3. Persists to user's profile metadata / active draft booking for persistent cross-device restoration.
 */
export class CartCloudSyncService {
  private activeChannel: any = null;
  private currentUserId: string | null = null;
  private deviceId: string = Math.random().toString(36).substring(2, 10);

  /**
   * Subscribe to real-time cart updates for the authenticated user
   */
  subscribe(userId: string, onRemoteCartUpdate: CartSyncCallback) {
    if (this.currentUserId === userId && this.activeChannel) {
      return;
    }

    this.unsubscribe();
    this.currentUserId = userId;

    const channelName = `cart_sync_${userId}`;
    this.activeChannel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false, // Don't receive own broadcasts
        },
      },
    });

    this.activeChannel
      .on('broadcast', { event: 'CART_UPDATED' }, (payload: { payload?: CartPayload }) => {
        if (payload?.payload?.items && payload?.payload?.deviceOrigin !== this.deviceId) {
          onRemoteCartUpdate(payload.payload.items);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Pull latest cart from user metadata / cloud
          this.pullLatestCart(userId).then((cloudItems) => {
            if (cloudItems && Object.keys(cloudItems).length > 0) {
              onRemoteCartUpdate(cloudItems);
            }
          });
        }
      });
  }

  /**
   * Broadcast local cart modifications to all other logged-in devices
   */
  async broadcastCartChange(items: Record<string, CartItem>) {
    if (!this.activeChannel || !this.currentUserId) return;

    const payload: CartPayload = {
      items,
      updatedAt: new Date().toISOString(),
      deviceOrigin: this.deviceId,
    };

    try {
      // 1. Instant Realtime broadcast to other connected devices
      await this.activeChannel.send({
        type: 'broadcast',
        event: 'CART_UPDATED',
        payload,
      });

      // 2. Persist to Supabase user metadata asynchronously so newly opened devices fetch it
      await supabase.auth.updateUser({
        data: {
          synced_cart: items,
          synced_cart_updated_at: payload.updatedAt,
        },
      });
    } catch (err) {
      console.warn('[CartCloudSyncService] Failed to broadcast cart change:', err);
    }
  }

  /**
   * Fetch persisted cloud cart when signing in or launching on a new device
   */
  async pullLatestCart(userId: string): Promise<Record<string, CartItem> | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id === userId && user.user_metadata?.synced_cart) {
        return user.user_metadata.synced_cart as Record<string, CartItem>;
      }
    } catch (e) {
      console.warn('[CartCloudSyncService] Failed to pull latest cart:', e);
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
  }
}

export const cartCloudSyncService = new CartCloudSyncService();
