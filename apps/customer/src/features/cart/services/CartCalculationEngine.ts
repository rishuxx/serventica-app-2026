import { CartItem, CartFeeBreakdown } from '../domain/Cart';
import { ICartCalculationEngine } from './ICartEngine';
import { PriceCalculationEngine } from '../../../services/pricing/PriceCalculationEngine';

/**
 * CartCalculationEngine
 * Single Responsibility: Pure fee, discount, and total calculation.
 * Delegates to centralized domain PriceCalculationEngine for 100% price consistency across app.
 */
export class CartCalculationEngine implements ICartCalculationEngine {
  calculateFees(items: Record<string, CartItem>): CartFeeBreakdown {
    const itemList = Object.values(items);
    if (itemList.length === 0) {
      return {
        itemTotal: 0,
        convenienceFee: 0,
        partnerSafetyFee: 0,
        discountAmount: 0,
        finalPayable: 0,
      };
    }

    const bill = PriceCalculationEngine.calculateBill({
      items: itemList.map((it) => ({
        unitPrice: it.basePrice,
        quantity: it.quantity,
        totalPrice: it.basePrice * it.quantity,
      })),
    });

    return {
      itemTotal: bill.itemTotal,
      convenienceFee: bill.deliveryOrSafetyFee,
      partnerSafetyFee: bill.isHandlingFeeFree ? 0 : bill.handlingFee,
      discountAmount: bill.discountAmount,
      finalPayable: bill.finalPayable,
    };
  }

  calculateTotalItems(items: Record<string, CartItem>): number {
    return Object.values(items).reduce((count, item) => count + item.quantity, 0);
  }
}
