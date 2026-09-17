/**
 * SERVENTICA — Cart Domain Model (OOP / SOLID)
 */

export interface CartItem {
  serviceId: string;
  slug: string;
  name: string;
  categoryName?: string;
  categoryId?: string;
  imageUrl?: string;
  basePrice: number;
  durationMinutes: number;
  quantity: number;
}

export interface CartFeeBreakdown {
  itemTotal: number;
  convenienceFee: number;
  partnerSafetyFee: number;
  discountAmount: number;
  finalPayable: number;
}

export interface CartState {
  items: Record<string, CartItem>;
  itemCount: number;
  fees: CartFeeBreakdown;
}
