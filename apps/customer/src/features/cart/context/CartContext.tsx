import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { CartItem, CartFeeBreakdown } from '../domain/Cart';
import { ServiceDetailItem } from '../../../types/category.types';
import { SafeAsyncStorage as AsyncStorage } from '@serventica/utils';

const CART_STORAGE_KEY = '@serventica_customer_cart_v1';

/**
 * CartCalculationEngine
 * Single Responsibility: Pure math (item total, fees, tiered discounts, payable).
 */
export class CartCalculationEngine {
  private readonly CONVENIENCE_FEE = 29;
  private readonly SAFETY_FEE = 19;

  calculateFees(items: Record<string, CartItem>): CartFeeBreakdown {
    const itemList = Object.values(items);
    const itemTotal = itemList.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);

    if (itemTotal === 0) {
      return {
        itemTotal: 0,
        convenienceFee: 0,
        partnerSafetyFee: 0,
        discountAmount: 0,
        finalPayable: 0,
      };
    }

    // Tiered promo discount logic: 10% discount on carts >= ₹999
    let discountAmount = 0;
    if (itemTotal >= 999) {
      discountAmount = Math.round(itemTotal * 0.1);
    }

    const convenienceFee = this.CONVENIENCE_FEE;
    const partnerSafetyFee = this.SAFETY_FEE;
    const finalPayable = Math.max(0, itemTotal + convenienceFee + partnerSafetyFee - discountAmount);

    return {
      itemTotal,
      convenienceFee,
      partnerSafetyFee,
      discountAmount,
      finalPayable,
    };
  }

  calculateTotalItems(items: Record<string, CartItem>): number {
    return Object.values(items).reduce((count, item) => count + item.quantity, 0);
  }
}

/**
 * CartStorageService
 * Single Responsibility: AsyncStorage persistence for Cart data.
 */
export class CartStorageService {
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

interface CartContextValue {
  items: Record<string, CartItem>;
  itemCount: number;
  fees: CartFeeBreakdown;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  addItem: (service: ServiceDetailItem | { id: string; name: string; slug: string; base_price: number; duration_minutes?: number; image_url?: string; category_name?: string; category_id?: string }) => void;
  removeItem: (serviceId: string) => void;
  clearCart: () => void;
  getItemQuantity: (serviceId: string) => number;
}

const calculationEngine = new CartCalculationEngine();
const storageService = new CartStorageService();

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<Record<string, CartItem>>({});
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // 1. Hydrate cart from AsyncStorage on mount
  useEffect(() => {
    storageService.loadPersistedCart().then((persisted) => {
      if (persisted && Object.keys(persisted).length > 0) {
        setItems(persisted);
      }
      setIsHydrated(true);
    });
  }, []);

  // 2. Persist cart changes
  useEffect(() => {
    if (isHydrated) {
      storageService.persistCart(items);
    }
  }, [items, isHydrated]);

  const fees = useMemo(() => calculationEngine.calculateFees(items), [items]);
  const itemCount = useMemo(() => calculationEngine.calculateTotalItems(items), [items]);

  const addItem = useCallback((service: any) => {
    setItems((prev) => {
      const id = service.id || service.serviceId;
      if (!id) return prev;
      const existing = prev[id];
      const basePrice = Number(service.base_price ?? service.basePrice ?? 0);
      const durationMinutes = Number(service.duration_minutes ?? service.durationMinutes ?? 45);
      const name = service.name || 'Service';
      const slug = service.slug || '';
      const imageUrl = service.image_url || service.imageUrl || '';
      const categoryName = service.category_name || service.categoryName || '';
      const categoryId = service.category_id || service.categoryId || '';

      const updatedQty = (existing?.quantity || 0) + 1;
      return {
        ...prev,
        [id]: {
          serviceId: id,
          slug,
          name,
          categoryName,
          categoryId,
          imageUrl,
          basePrice,
          durationMinutes,
          quantity: updatedQty,
        },
      };
    });
  }, []);

  const removeItem = useCallback((serviceId: string) => {
    setItems((prev) => {
      const existing = prev[serviceId];
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      }

      return {
        ...prev,
        [serviceId]: {
          ...existing,
          quantity: existing.quantity - 1,
        },
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems({});
    storageService.clearCart();
  }, []);

  const getItemQuantity = useCallback((serviceId: string) => {
    return items[serviceId]?.quantity || 0;
  }, [items]);

  const openCartDrawer = useCallback(() => setIsCartDrawerOpen(true), []);
  const closeCartDrawer = useCallback(() => setIsCartDrawerOpen(false), []);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      fees,
      isCartDrawerOpen,
      openCartDrawer,
      closeCartDrawer,
      addItem,
      removeItem,
      clearCart,
      getItemQuantity,
    }),
    [items, itemCount, fees, isCartDrawerOpen, openCartDrawer, closeCartDrawer, addItem, removeItem, clearCart, getItemQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
