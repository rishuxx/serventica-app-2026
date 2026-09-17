import { CartItem, CartFeeBreakdown } from '../domain/Cart';
import { ICartCalculationEngine } from './ICartEngine';

/**
 * CartCalculationEngine
 * Single Responsibility: Pure fee, discount, and total calculation.
 */
export class CartCalculationEngine implements ICartCalculationEngine {
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

    // Tiered promo discount logic
    let discountAmount = 0;
    if (itemTotal >= 999) {
      discountAmount = Math.round(itemTotal * 0.1); // 10% off on orders above 999
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
