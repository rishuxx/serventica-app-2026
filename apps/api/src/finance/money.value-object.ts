import { CurrencyCode, MoneyMinor } from '@serventica/types';

/**
 * Immutable Domain Value Object representing Money in integer minor units (paise).
 * Eliminates floating point drift across financial transactions.
 */
export class Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;

  constructor(amountMinor: number, currency: CurrencyCode = 'INR') {
    if (!Number.isInteger(amountMinor)) {
      throw new Error(`[Money] Amount must be an integer minor unit (e.g. paise), got: ${amountMinor}`);
    }
    this.amountMinor = amountMinor;
    this.currency = currency;
  }

  static fromRupees(rupees: number, currency: CurrencyCode = 'INR'): Money {
    const minor = Math.round(rupees * 100);
    return new Money(minor, currency);
  }

  static fromMinor(minor: number, currency: CurrencyCode = 'INR'): Money {
    return new Money(minor, currency);
  }

  static zero(currency: CurrencyCode = 'INR'): Money {
    return new Money(0, currency);
  }

  toRupees(): number {
    return this.amountMinor / 100;
  }

  formatted(): string {
    const symbol = this.currency === 'INR' ? '₹' : '$';
    return `${symbol}${(this.amountMinor / 100).toFixed(2)}`;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.amountMinor * factor), this.currency);
  }

  /**
   * Allocates an amount across proportional shares without losing minor units (remainder preserved)
   */
  allocate(ratios: number[]): Money[] {
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    if (totalRatio === 0) {
      throw new Error('[Money.allocate] Total ratio cannot be zero');
    }

    let remainder = this.amountMinor;
    const results: Money[] = ratios.map((ratio) => {
      const share = Math.floor((this.amountMinor * ratio) / totalRatio);
      remainder -= share;
      return new Money(share, this.currency);
    });

    // Distribute remainder 1 minor unit at a time to highest ratios
    for (let i = 0; remainder > 0; i = (i + 1) % results.length) {
      results[i] = new Money(results[i].amountMinor + 1, this.currency);
      remainder--;
    }

    return results;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor > other.amountMinor;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountMinor < other.amountMinor;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amountMinor === other.amountMinor;
  }

  private assertSameCurrency(other: Money) {
    if (this.currency !== other.currency) {
      throw new Error(`[Money] Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }

  toJSON(): MoneyMinor {
    return {
      amountMinor: this.amountMinor,
      currency: this.currency,
    };
  }
}
