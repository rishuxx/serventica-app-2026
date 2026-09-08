export type AnalyticsEventName =
  | 'app_opened'
  | 'location_selected'
  | 'serviceability_checked'
  | 'category_viewed'
  | 'service_viewed'
  | 'add_to_cart'
  | 'checkout_started'
  | 'payment_started'
  | 'payment_success'
  | 'payment_failed'
  | 'booking_created'
  | 'booking_cancelled'
  | 'partner_assigned'
  | 'service_started'
  | 'service_completed'
  | 'review_submitted';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: Record<string, unknown>;
  timestamp: string;
}
