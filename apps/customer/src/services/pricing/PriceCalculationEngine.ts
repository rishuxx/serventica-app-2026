/**
 * SERVENTICA — Domain Price Calculation Engine (OOP / SOLID)
 * 
 * Single Responsibility:
 * Centralized, authoritative calculation of item totals, tiered discounts,
 * safety/insurance fees, handling charges, and final payable amounts.
 * Eliminates arbitrary hardcoding and ensures 100% price consistency across:
 * - Cart Drawer & Checkout
 * - Payment Orchestration & Gateways (Razorpay/UPI/COD)
 * - Booking Persistence (Local & Supabase)
 * - Ticket Rendering & Bill Breakdown (BookingDetail, UpcomingBookingCard, BookingsScreen)
 */

export interface BillPriceBreakdown {
  /** Total sum of all base items (sum of unitPrice * quantity) */
  itemTotal: number;
  /** Strikethrough original price if promo/discount is active */
  originalItemTotal: number;
  /** Servs safety, verification and insurance fee */
  deliveryOrSafetyFee: number;
  /** Handling fee / booking surcharge (rendered as FREE promo if waived) */
  handlingFee: number;
  /** Whether handling fee is waived/free */
  isHandlingFeeFree: boolean;
  /** Total discount amount deducted */
  discountAmount: number;
  /** Final total payable amount by the customer */
  finalPayable: number;
  /** Total original bill before discounts */
  totalOriginalBill: number;
  /** Currency code */
  currency: string;
}

export interface CalculateBillParams {
  itemTotal?: number;
  subtotal?: number;
  items?: Array<{ unitPrice?: number; totalPrice?: number; quantity?: number; basePrice?: number }>;
  discount?: number;
  discountAmount?: number;
  platformFee?: number;
  deliveryOrSafetyFee?: number;
  handlingFee?: number;
  total?: number; // Authoritative saved total if already persisted
}

export class PriceCalculationEngine {
  private static readonly DEFAULT_SAFETY_FEE = 29;
  private static readonly DEFAULT_HANDLING_FEE = 19;
  private static readonly DEFAULT_FALLBACK_PRICE = 499;

  /**
   * Pure calculation function: computes complete, transparent bill breakdown.
   */
  public static calculateBill(params?: CalculateBillParams | null): BillPriceBreakdown {
    if (!params) {
      return this.getDefaultBreakdown(this.DEFAULT_FALLBACK_PRICE);
    }

    // 1. Resolve itemTotal from items array, explicit subtotal, or explicit itemTotal
    let calculatedItemTotal = 0;

    if (params.items && Array.isArray(params.items) && params.items.length > 0) {
      calculatedItemTotal = params.items.reduce((sum, item) => {
        const itemPrice = item.totalPrice ?? (item.unitPrice ?? item.basePrice ?? 0) * (item.quantity ?? 1);
        return sum + itemPrice;
      }, 0);
    }

    if (calculatedItemTotal === 0) {
      if (typeof params.itemTotal === 'number' && params.itemTotal > 0) {
        calculatedItemTotal = params.itemTotal;
      } else if (typeof params.subtotal === 'number' && params.subtotal > 0) {
        calculatedItemTotal = params.subtotal;
      } else if (typeof params.total === 'number' && params.total > 0) {
        // Reverse-calculate if only total was previously recorded
        const rawTotal = params.total;
        const discount = params.discount || params.discountAmount || 0;
        calculatedItemTotal = Math.max(0, rawTotal - this.DEFAULT_SAFETY_FEE + discount);
      } else {
        calculatedItemTotal = this.DEFAULT_FALLBACK_PRICE;
      }
    }

    // 2. Resolve Fees
    const deliveryOrSafetyFee = typeof params.deliveryOrSafetyFee === 'number'
      ? params.deliveryOrSafetyFee
      : typeof params.platformFee === 'number' && params.platformFee > 0
      ? params.platformFee
      : this.DEFAULT_SAFETY_FEE;

    const handlingFee = typeof params.handlingFee === 'number' ? params.handlingFee : this.DEFAULT_HANDLING_FEE;
    const isHandlingFeeFree = true; // Serventica promo: handling fee is always waived for customers

    // 3. Resolve Discounts (Tiered promo or explicit discount)
    let discountAmount = 0;
    if (typeof params.discount === 'number' && params.discount > 0) {
      discountAmount = params.discount;
    } else if (typeof params.discountAmount === 'number' && params.discountAmount > 0) {
      discountAmount = params.discountAmount;
    } else if (calculatedItemTotal >= 999) {
      // Automatic 10% discount on orders >= 999
      discountAmount = Math.round(calculatedItemTotal * 0.1);
    }

    // 4. Resolve Final Payable Amount (Strict real-time mathematical calculation)
    const finalPayable = Math.max(0, calculatedItemTotal + deliveryOrSafetyFee - discountAmount);

    // 5. Strikethrough Display Values (Calculated cleanly and intuitively)
    const originalItemTotal = discountAmount > 0 ? calculatedItemTotal + discountAmount : calculatedItemTotal;
    const totalOriginalBill = discountAmount > 0 ? originalItemTotal + deliveryOrSafetyFee + (isHandlingFeeFree ? handlingFee : 0) : finalPayable;

    return {
      itemTotal: calculatedItemTotal,
      originalItemTotal,
      deliveryOrSafetyFee,
      handlingFee,
      isHandlingFeeFree,
      discountAmount,
      finalPayable,
      totalOriginalBill,
      currency: 'INR',
    };
  }

  /**
   * Helper to generate a default fallback breakdown for a given base amount
   */
  private static getDefaultBreakdown(baseAmount: number): BillPriceBreakdown {
    const deliveryOrSafetyFee = this.DEFAULT_SAFETY_FEE;
    const handlingFee = this.DEFAULT_HANDLING_FEE;
    const isHandlingFeeFree = true;
    const discountAmount = 0;
    const finalPayable = baseAmount + deliveryOrSafetyFee;
    const originalItemTotal = baseAmount;
    const totalOriginalBill = finalPayable;

    return {
      itemTotal: baseAmount,
      originalItemTotal,
      deliveryOrSafetyFee,
      handlingFee,
      isHandlingFeeFree,
      discountAmount,
      finalPayable,
      totalOriginalBill,
      currency: 'INR',
    };
  }

  /**
   * Format numbers into clean INR currency format (e.g. ₹1,500)
   */
  public static formatINR(amount: number): string {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }
}

export const priceCalculationEngine = PriceCalculationEngine;
