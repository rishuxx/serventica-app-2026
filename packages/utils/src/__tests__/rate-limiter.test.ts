import { SlidingWindowRateLimiter, MobileClientRateLimiter } from '../index';

describe('SlidingWindowRateLimiter', () => {
  beforeEach(() => {
    SlidingWindowRateLimiter.reset();
  });

  it('should allow requests within limit', () => {
    const rule = { key: 'test:user1', limit: 3, windowSeconds: 60 };

    expect(SlidingWindowRateLimiter.check(rule).isAllowed).toBe(true);
    expect(SlidingWindowRateLimiter.check(rule).isAllowed).toBe(true);
    expect(SlidingWindowRateLimiter.check(rule).isAllowed).toBe(true);
  });

  it('should reject requests exceeding limit', () => {
    const rule = { key: 'test:user2', limit: 2, windowSeconds: 60 };

    SlidingWindowRateLimiter.check(rule); // 1
    SlidingWindowRateLimiter.check(rule); // 2

    const result = SlidingWindowRateLimiter.check(rule); // 3 (exceeded)
    expect(result.isAllowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe('MobileClientRateLimiter', () => {
  beforeEach(() => {
    MobileClientRateLimiter.reset();
  });

  it('should prevent rapid double taps on buttons', () => {
    const actionKey = 'get_otp_btn';

    expect(MobileClientRateLimiter.canExecuteAction(actionKey, 1000)).toBe(true);
    expect(MobileClientRateLimiter.canExecuteAction(actionKey, 1000)).toBe(false); // Throttled locally!
  });
});
