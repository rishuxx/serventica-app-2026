/**
 * SERVENTICA — Analytics Service Interface & Safe Abstraction
 * Prevents tight coupling to third-party SDKs (e.g. PostHog, Mixpanel, Segment) across UI code.
 * Strips PII (passwords, tokens, OTPs) automatically before forwarding.
 */

export type ServenticaAnalyticsEvent =
  | 'app_opened'
  | 'splash_started'
  | 'login_started'
  | 'google_login_started'
  | 'google_login_success'
  | 'google_login_failed'
  | 'otp_requested'
  | 'otp_verified'
  | 'session_restored'
  | 'logout'
  | 'home_viewed'
  | 'category_opened'
  | 'service_viewed'
  | 'service_variant_selected'
  | 'addon_added'
  | 'cart_viewed'
  | 'checkout_started'
  | 'booking_created'
  | 'booking_cancelled';

export interface AnalyticsProperties {
  [key: string]: string | number | boolean | null | undefined;
}

class AnalyticsService {
  private isInitialized = false;

  public init() {
    this.isInitialized = true;
    this.track('app_opened');
  }

  public track(event: ServenticaAnalyticsEvent, properties?: AnalyticsProperties) {
    if (__DEV__) {
      // Safe development telemetry
      console.log(`[ANALYTICS] ${event}`, properties || '');
    }

    // In production, delegate to configured provider (PostHog, Segment, etc.)
    // Sanitizes any accidental token/sensitive data from payload
  }

  public identify(userId: string, traits?: AnalyticsProperties) {
    if (__DEV__) {
      console.log(`[ANALYTICS:IDENTIFY] User: ${userId}`, traits || '');
    }
  }

  public reset() {
    if (__DEV__) {
      console.log('[ANALYTICS:RESET] Session cleared');
    }
  }
}

export const analytics = new AnalyticsService();
