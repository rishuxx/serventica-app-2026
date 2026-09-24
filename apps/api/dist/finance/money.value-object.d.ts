import { CurrencyCode, MoneyMinor } from '@serventica/types';
export declare class Money {
    readonly amountMinor: number;
    readonly currency: CurrencyCode;
    constructor(amountMinor: number, currency?: CurrencyCode);
    static fromRupees(rupees: number, currency?: CurrencyCode): Money;
    static fromMinor(minor: number, currency?: CurrencyCode): Money;
    static zero(currency?: CurrencyCode): Money;
    toRupees(): number;
    formatted(): string;
    add(other: Money): Money;
    subtract(other: Money): Money;
    multiply(factor: number): Money;
    allocate(ratios: number[]): Money[];
    isGreaterThan(other: Money): boolean;
    isLessThan(other: Money): boolean;
    equals(other: Money): boolean;
    private assertSameCurrency;
    toJSON(): MoneyMinor;
}
