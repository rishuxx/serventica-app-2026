import { PushNotificationService } from '../tracking/push-notification.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
export interface OutboxMessage {
    id: string;
    booking_id: string;
    event_type: string;
    payload: Record<string, any>;
    status: 'PENDING' | 'PROCESSED' | 'FAILED';
    retry_count: number;
}
export declare class FulfillmentOutboxService {
    private readonly pushNotifications;
    private readonly trackingGateway;
    private readonly logger;
    private isProcessing;
    private inMemoryQueue;
    constructor(pushNotifications: PushNotificationService, trackingGateway: TrackingGateway);
    enqueueEvent(event: Omit<OutboxMessage, 'status' | 'retry_count'>): void;
    processQueue(): Promise<number>;
    private dispatchSingleEvent;
    private getNotificationTitle;
    private getNotificationBody;
}
