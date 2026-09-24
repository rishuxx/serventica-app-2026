export interface PushNotificationPayload {
    recipientId: string;
    bookingId: string;
    eventType: 'PARTNER_ASSIGNED' | 'PARTNER_EN_ROUTE' | 'ARRIVING_SOON' | 'PARTNER_ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED' | 'BOOKING_CANCELLED';
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
export declare class PushNotificationService {
    private readonly logger;
    private readonly sentIdempotencyKeys;
    private readonly userPushTokens;
    registerDeviceToken(userId: string, token: string): void;
    removeDeviceToken(userId: string, token: string): void;
    dispatchNotification(payload: PushNotificationPayload): Promise<{
        dispatched: boolean;
        reason?: string;
    }>;
}
