"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
class Money {
    constructor(amountMinor, currency = 'INR') {
        if (!Number.isInteger(amountMinor)) {
            throw new Error(`[Money] Amount must be an integer minor unit (e.g. paise), got: ${amountMinor}`);
        }
        this.amountMinor = amountMinor;
        this.currency = currency;
    }
    static fromRupees(rupees, currency = 'INR') {
        const minor = Math.round(rupees * 100);
        return new Money(minor, currency);
    }
    static fromMinor(minor, currency = 'INR') {
        return new Money(minor, currency);
    }
    static zero(currency = 'INR') {
        return new Money(0, currency);
    }
    toRupees() {
        return this.amountMinor / 100;
    }
    formatted() {
        const symbol = this.currency === 'INR' ? '₹' : '$';
        return `${symbol}${(this.amountMinor / 100).toFixed(2)}`;
    }
    add(other) {
        this.assertSameCurrency(other);
        return new Money(this.amountMinor + other.amountMinor, this.currency);
    }
    subtract(other) {
        this.assertSameCurrency(other);
        return new Money(this.amountMinor - other.amountMinor, this.currency);
    }
    multiply(factor) {
        return new Money(Math.round(this.amountMinor * factor), this.currency);
    }
    allocate(ratios) {
        const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
        if (totalRatio === 0) {
            throw new Error('[Money.allocate] Total ratio cannot be zero');
        }
        let remainder = this.amountMinor;
        const results = ratios.map((ratio) => {
            const share = Math.floor((this.amountMinor * ratio) / totalRatio);
            remainder -= share;
            return new Money(share, this.currency);
        });
        for (let i = 0; remainder > 0; i = (i + 1) % results.length) {
            results[i] = new Money(results[i].amountMinor + 1, this.currency);
            remainder--;
        }
        return results;
    }
    isGreaterThan(other) {
        this.assertSameCurrency(other);
        return this.amountMinor > other.amountMinor;
    }
    isLessThan(other) {
        this.assertSameCurrency(other);
        return this.amountMinor < other.amountMinor;
    }
    equals(other) {
        return this.currency === other.currency && this.amountMinor === other.amountMinor;
    }
    assertSameCurrency(other) {
        if (this.currency !== other.currency) {
            throw new Error(`[Money] Currency mismatch: ${this.currency} vs ${other.currency}`);
        }
    }
    toJSON() {
        return {
            amountMinor: this.amountMinor,
            currency: this.currency,
        };
    }
}
exports.Money = Money;
//# sourceMappingURL=money.value-object.js.map