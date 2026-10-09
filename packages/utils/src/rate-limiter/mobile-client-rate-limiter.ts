/**
 * SERVENTICA — Mobile Client-Side Rate Limiter & Resiliency Handler
 * Implements client-side best practices from system design architecture:
 * 1. Debounces rapid client taps locally before network request emission.
 * 2. Handles HTTP 429 Too Many Requests with exponential backoff & jitter.
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
}

export class MobileClientRateLimiter {
  private static lastActionMap: Map<string, number> = new Map();

  /**
   * Client-Side Lock: Prevents duplicate rapid taps on critical buttons (OTP, Payment)
   * Returns true if action is allowed, false if blocked by local cooldown.
   */
  public static canExecuteAction(actionKey: string, cooldownMs: number = 1000): boolean {
    const now = Date.now();
    const lastExecuted = this.lastActionMap.get(actionKey) || 0;

    if (now - lastExecuted < cooldownMs) {
      return false; // Throttled on client
    }

    this.lastActionMap.set(actionKey, now);
    return true;
  }

  /**
   * Exponential Backoff Retry Wrapper for API calls
   * Handles 429 Too Many Requests and network blips gracefully.
   */
  public static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> {
    const maxRetries = config.maxRetries ?? 3;
    const initialDelayMs = config.initialDelayMs ?? 500;
    const maxDelayMs = config.maxDelayMs ?? 5000;
    const backoffFactor = config.backoffFactor ?? 2;

    let attempt = 0;
    let delay = initialDelayMs;

    while (true) {
      try {
        return await fn();
      } catch (error: any) {
        attempt++;

        const isRateLimited =
          error?.status === 429 ||
          error?.statusCode === 429 ||
          String(error?.message || '').toLowerCase().includes('too many requests') ||
          String(error?.message || '').toLowerCase().includes('rate limit');

        if (attempt > maxRetries || !isRateLimited) {
          throw error;
        }

        // Respect server Retry-After header if provided
        let retryAfterMs = delay;
        if (error?.headers?.['retry-after'] || error?.headers?.['x-ratelimit-reset']) {
          const seconds = parseInt(error.headers['retry-after'] || error.headers['x-ratelimit-reset'], 10);
          if (!isNaN(seconds)) {
            retryAfterMs = seconds * 1000;
          }
        } else {
          // Calculate jittered exponential backoff
          const jitter = Math.random() * 200;
          delay = Math.min(delay * backoffFactor + jitter, maxDelayMs);
          retryAfterMs = delay;
        }

        await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
      }
    }
  }

  /**
   * Reset action lock map (for testing)
   */
  public static reset(): void {
    this.lastActionMap.clear();
  }
}
