import { CartItem, CartFeeBreakdown } from '../domain/Cart';

export interface ICartCalculationEngine {
  calculateFees(items: Record<string, CartItem>): CartFeeBreakdown;
  calculateTotalItems(items: Record<string, CartItem>): number;
}

export interface ICartStorageService {
  loadPersistedCart(): Promise<Record<string, CartItem> | null>;
  persistCart(items: Record<string, CartItem>): Promise<void>;
  clearCart(): Promise<void>;
}
