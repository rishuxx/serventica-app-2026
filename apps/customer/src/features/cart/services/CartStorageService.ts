import { SafeAsyncStorage as AsyncStorage } from '../../../../../../packages/utils/src/storage/safe-storage';
import { CartItem } from '../domain/Cart';
import { ICartStorageService } from './ICartEngine';

const CART_STORAGE_KEY = '@serventica_customer_cart_v1';

/**
 * CartStorageService
 * Single Responsibility: AsyncStorage persistence for Cart data.
 */
export class CartStorageService implements ICartStorageService {
  async loadPersistedCart(): Promise<Record<string, CartItem> | null> {
    try {
      const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[CartStorageService] Failed to load persisted cart:', e);
    }
    return null;
  }

  async persistCart(items: Record<string, CartItem>): Promise<void> {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[CartStorageService] Failed to persist cart:', e);
    }
  }

  async clearCart(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
      console.warn('[CartStorageService] Failed to clear cart:', e);
    }
  }
}
