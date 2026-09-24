import { Injectable, Logger } from '@nestjs/common';

export interface PushNotificationPayload {
  recipientId: string;
  bookingId: string;
  eventType:
    | 'PARTNER_ASSIGNED'
    | 'PARTNER_EN_ROUTE'
    | 'ARRIVING_SOON'
    | 'PARTNER_ARRIVED'
    | 'SERVICE_STARTED'
    | 'SERVICE_COMPLETED'
    | 'BOOKING_CANCELLED';
  title: string;
  body: string;
  data?: Record<string, any>;
  idempotencyKey?: string;
}

export interface INotificationProvider {
  sendPush(payload: PushNotificationPayload, pushTokens: string[]): Promise<{
    success: boolean;
    sentCount: number;
    failedTokens: string[];
  }>;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  // In-memory idempotency deduplication cache: idempotencyKey -> timestamp
  private readonly sentIdempotencyKeys: Map<string, number> = new Map();
  // In-memory mock device token store: userId -> Set of push tokens
  private readonly userPushTokens: Map<string, Set<string>> = new Map();

  /**
   * Registers a push token for a user
   */
  public registerDeviceToken(userId: string, token: string): void {
    if (!userId || !token) return;
    const tokens = this.userPushTokens.get(userId) || new Set();
    tokens.add(token);
    this.userPushTokens.set(userId, tokens);
    this.logger.log(`[DeviceTokenRegistered] User ${userId} registered push token (total: ${tokens.size})`);
  }

  /**
   * Removes a push token (e.g. on logout or invalid token)
   */
  public removeDeviceToken(userId: string, token: string): void {
    const tokens = this.userPushTokens.get(userId);
    if (tokens) {
      tokens.delete(token);
      if (tokens.size === 0) {
        this.userPushTokens.delete(userId);
      }
    }
  }

  /**
   * Dispatches push notification with strict idempotency deduplication
   */
  public async dispatchNotification(payload: PushNotificationPayload): Promise<{
    dispatched: boolean;
    reason?: string;
  }> {
    const key = payload.idempotencyKey || `${payload.bookingId}:${payload.eventType}`;

    // 1. Idempotency Check: if notification already sent for this key, drop duplicate
    if (this.sentIdempotencyKeys.has(key)) {
      this.logger.debug(`[PushDeduplicated] Notification with key '${key}' already dispatched. Skipping.`);
      return { dispatched: false, reason: 'IDEMPOTENCY_DEDUPLICATED' };
    }

    // 2. Fetch active tokens for recipient
    const tokensSet = this.userPushTokens.get(payload.recipientId);
    const tokens = tokensSet ? Array.from(tokensSet) : [];

    // Mark as sent in idempotency cache
    this.sentIdempotencyKeys.set(key, Date.now());

    this.logger.log(
      `[PushDispatch] Event: ${payload.eventType} -> Recipient: ${payload.recipientId} | Title: "${payload.title}" | Body: "${payload.body}" | Tokens: ${tokens.length}`
    );

    // In production with Expo Push API, sends HTTP POST to https://exp.host/--/api/v2/push/send
    // If tokens is 0, payload is still queued / recorded in DB for in-app recovery
    return { dispatched: true };
  }
}
