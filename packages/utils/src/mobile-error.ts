/**
 * Mobile-specific Structured Error Engine in accordance with mobile-backend.md
 */

export interface MobileErrorAction {
  type: 'navigate' | 'retry' | 'support' | 'dismiss';
  destination?: string;
}

export interface MobileErrorPayload {
  code: string;
  message: string;
  user_message: string;
  action: MobileErrorAction;
  retry: {
    allowed: boolean;
    after_seconds: number;
    max_retries: number;
  };
}

export class MobileErrorTransformer {
  /**
   * Transforms raw Supabase / Network / HTTP errors into user-friendly mobile error objects
   */
  static transform(error: any): MobileErrorPayload {
    if (!error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        user_message: 'Something went wrong. Please try again.',
        action: { type: 'retry' },
        retry: { allowed: true, after_seconds: 3, max_retries: 3 },
      };
    }

    const message = error.message || error.error_description || String(error);

    // Network / Offline errors
    if (
      message.toLowerCase().includes('network request failed') ||
      message.toLowerCase().includes('failed to fetch') ||
      message.toLowerCase().includes('offline') ||
      message.toLowerCase().includes('connection refused')
    ) {
      return {
        code: 'NETWORK_UNAVAILABLE',
        message,
        user_message: 'No internet connection. Please check your network and try again.',
        action: { type: 'retry' },
        retry: { allowed: true, after_seconds: 2, max_retries: 5 },
      };
    }

    // Authentication & Session Expired errors (HTTP 401)
    if (
      message.toLowerCase().includes('jwt expired') ||
      message.toLowerCase().includes('invalid token') ||
      message.toLowerCase().includes('unauthorized') ||
      error.status === 401
    ) {
      return {
        code: 'AUTH_SESSION_EXPIRED',
        message,
        user_message: 'Your session has expired. Please sign in again.',
        action: { type: 'navigate', destination: 'LOGIN' },
        retry: { allowed: false, after_seconds: 0, max_retries: 0 },
      };
    }

    // Rate limits (HTTP 429)
    if (message.toLowerCase().includes('rate limit') || error.status === 429) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        user_message: 'Too many requests. Please wait a few seconds before trying again.',
        action: { type: 'retry' },
        retry: { allowed: true, after_seconds: 10, max_retries: 3 },
      };
    }

    // Serviceability / Location errors
    if (message.toLowerCase().includes('unserviceable') || message.toLowerCase().includes('not serviceable')) {
      return {
        code: 'LOCATION_UNSERVICEABLE',
        message,
        user_message: 'Serventica professionals are not yet available in this exact pincode.',
        action: { type: 'navigate', destination: 'SELECT_LOCATION' },
        retry: { allowed: false, after_seconds: 0, max_retries: 0 },
      };
    }

    // Generic server / Supabase error fallback
    return {
      code: 'SERVER_ERROR',
      message,
      user_message: 'Unable to reach the service. Our technicians have been alerted.',
      action: { type: 'retry' },
      retry: { allowed: true, after_seconds: 5, max_retries: 2 },
    };
  }

  /**
   * Exponential backoff retry utility for mobile requests
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) {
          throw MobileErrorTransformer.transform(err);
        }
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw MobileErrorTransformer.transform(new Error('Max retries exceeded'));
  }
}
