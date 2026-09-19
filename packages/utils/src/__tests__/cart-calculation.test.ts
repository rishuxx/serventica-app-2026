import { CartCalculationEngine } from '../../../../apps/customer/src/features/cart/context/CartContext';
import { CartItem } from '../../../../apps/customer/src/features/cart/domain/Cart';

describe('SERV-04 Cart Calculation Engine & Tiered Pricing', () => {
  const engine = new CartCalculationEngine();

  it('should return 0 for all fees when cart is empty', () => {
    const fees = engine.calculateFees({});
    expect(fees.itemTotal).toBe(0);
    expect(fees.convenienceFee).toBe(0);
    expect(fees.partnerSafetyFee).toBe(0);
    expect(fees.discountAmount).toBe(0);
    expect(fees.finalPayable).toBe(0);
  });

  it('should calculate accurate standard fees without discount for small orders', () => {
    const items: Record<string, CartItem> = {
      s1: {
        serviceId: 's1',
        name: 'Tap Leakage',
        slug: 'tap-leakage',
        basePrice: 199,
        durationMinutes: 30,
        quantity: 2,
      },
    };

    const fees = engine.calculateFees(items);
    expect(fees.itemTotal).toBe(398);
    expect(fees.convenienceFee).toBe(29);
    expect(fees.partnerSafetyFee).toBe(19);
    expect(fees.discountAmount).toBe(0);
    expect(fees.finalPayable).toBe(398 + 29 + 19); // 446
  });

  it('should apply 10% tiered discount for orders >= 999', () => {
    const items: Record<string, CartItem> = {
      s2: {
        serviceId: 's2',
        name: 'Deep Cleaning',
        slug: 'deep-cleaning',
        basePrice: 1499,
        durationMinutes: 120,
        quantity: 1,
      },
    };

    const fees = engine.calculateFees(items);
    expect(fees.itemTotal).toBe(1499);
    expect(fees.discountAmount).toBe(150); // Math.round(1499 * 0.1)
    expect(fees.finalPayable).toBe(1499 + 29 + 19 - 150); // 1397
  });

  it('should correctly sum total items in cart', () => {
    const items: Record<string, CartItem> = {
      s1: { serviceId: 's1', name: 'A', slug: 'a', basePrice: 100, durationMinutes: 20, quantity: 3 },
      s2: { serviceId: 's2', name: 'B', slug: 'b', basePrice: 200, durationMinutes: 30, quantity: 2 },
    };

    const count = engine.calculateTotalItems(items);
    expect(count).toBe(5);
  });
});
