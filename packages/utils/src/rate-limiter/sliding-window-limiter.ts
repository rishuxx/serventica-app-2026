/**
 * SERVENTICA — Distributed / In-Memory Sliding Window Counter Rate Limiter
 * Based on High-Scale System Design Principles (Cloudflare / Stripe pattern).
 * 
 * Combines low memory footprint with smooth window interpolation to prevent edge-spike traffic bursts.
 */

export interface RateLimiterRule {
  key: string;           // Identifier e.g. "otp:phone:+919876543210" or "api:ip:192.168.1.1"
  limit: number;         // Maximum allowed requests in window
  windowSeconds: number; // Rolling window size in seconds
}

export interface RateLimitResult {
  isAllowed: boolean;
  totalLimit: number;
  remaining: number;
  resetSeconds: number;
  currentCount: number;
}

interface WindowBucket {
  count: number;
  startTimeMs: number;
}

export class SlidingWindowRateLimiter {
  private static memoryStore: Map<string, WindowBucket> = new Map();

  /**
   * Evaluates request against Sliding Window Counter algorithm
   */
  public static check(rule: RateLimiterRule): RateLimitResult {
    const now = Date.now();
    const windowMs = rule.windowSeconds * 1000;
    const currentWindowStart = Math.floor(now / windowMs) * windowMs;
    const previousWindowStart = currentWindowStart - windowMs;

    const currentKey = `${rule.key}:${currentWindowStart}`;
    const previousKey = `${rule.key}:${previousWindowStart}`;

    const currentBucket = this.memoryStore.get(currentKey) || { count: 0, startTimeMs: currentWindowStart };
    const previousBucket = this.memoryStore.get(previousKey) || { count: 0, startTimeMs: previousWindowStart };

    // Calculate overlap percentage of rolling window with previous window
    const timeIntoCurrentWindow = now - currentWindowStart;
    const previousWindowWeight = 1 - timeIntoCurrentWindow / windowMs;

    // Weighted estimate of request count in current rolling window
    const estimatedCount = Math.floor(previousBucket.count * previousWindowWeight + currentBucket.count);
    const isAllowed = estimatedCount < rule.limit;

    if (isAllowed) {
      currentBucket.count += 1;
      this.memoryStore.set(currentKey, currentBucket);
    }

    const remaining = Math.max(0, rule.limit - (estimatedCount + (isAllowed ? 1 : 0)));
    const resetSeconds = Math.ceil((currentWindowStart + windowMs - now) / 1000);

    // Periodic cleanup of expired windows
    this.cleanup(now - windowMs * 2);

    return {
      isAllowed,
      totalLimit: rule.limit,
      remaining,
      resetSeconds,
      currentCount: estimatedCount + (isAllowed ? 1 : 0),
    };
  }

  /**
   * Clean up expired buckets from memory
   */
  private static cleanup(expiryThresholdMs: number): void {
    if (this.memoryStore.size < 500) return; // Cleanup threshold
    for (const [key, bucket] of this.memoryStore.entries()) {
      if (bucket.startTimeMs < expiryThresholdMs) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Reset rate limiter store (used for tests)
   */
  public static reset(): void {
    this.memoryStore.clear();
  }
}
