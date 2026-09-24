"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FulfillmentOutboxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentOutboxService = void 0;
const common_1 = require("@nestjs/common");
const push_notification_service_1 = require("../tracking/push-notification.service");
const tracking_gateway_1 = require("../tracking/tracking.gateway");
let FulfillmentOutboxService = FulfillmentOutboxService_1 = class FulfillmentOutboxService {
    constructor(pushNotifications, trackingGateway) {
        this.pushNotifications = pushNotifications;
        this.trackingGateway = trackingGateway;
        this.logger = new common_1.Logger(FulfillmentOutboxService_1.name);
        this.isProcessing = false;
        this.inMemoryQueue = [];
    }
    enqueueEvent(event) {
        this.inMemoryQueue.push({
            ...event,
            status: 'PENDING',
            retry_count: 0,
        });
        this.processQueue();
    }
    async processQueue() {
        if (this.isProcessing)
            return 0;
        this.isProcessing = true;
        let processedCount = 0;
        try {
            while (this.inMemoryQueue.length > 0) {
                const item = this.inMemoryQueue.shift();
                if (!item)
                    break;
                try {
                    await this.dispatchSingleEvent(item);
                    item.status = 'PROCESSED';
                    processedCount++;
                }
                catch (err) {
                    this.logger.error(`Failed to dispatch outbox event ${item.id}: ${err?.message}`);
                    item.retry_count++;
                    if (item.retry_count < 3) {
                        this.inMemoryQueue.push(item);
                    }
                }
            }
        }
        finally {
            this.isProcessing = false;
        }
        return processedCount;
    }
    async dispatchSingleEvent(item) {
        const { booking_id, event_type, payload } = item;
        try {
            this.trackingGateway.handleStatusUpdate({ id: 'system_outbox' }, { bookingId: booking_id, status: event_type });
        }
        catch (e) {
        }
        const customerId = payload?.customer_id;
        if (customerId) {
            await this.pushNotifications.dispatchNotification({
                recipientId: customerId,
                bookingId: booking_id,
                eventType: (event_type === 'BOOKING_CONFIRMED' ? 'PARTNER_ASSIGNED' : event_type),
                title: this.getNotificationTitle(event_type),
                body: this.getNotificationBody(event_type, payload),
                data: payload,
                idempotencyKey: `outbox:${item.id}`,
            });
        }
        this.logger.log(`[OutboxDispatched] Event ${event_type} for booking ${booking_id}`);
    }
    getNotificationTitle(eventType) {
        switch (eventType) {
            case 'BOOKING_CONFIRMED':
                return 'Booking Confirmed!';
            case 'PARTNER_ASSIGNED':
                return 'Specialist Assigned';
            case 'PARTNER_EN_ROUTE':
                return 'Specialist is On the Way!';
            case 'PARTNER_ARRIVED':
                return 'Specialist has Arrived';
            case 'SERVICE_STARTED':
                return 'Service Started';
            case 'SERVICE_COMPLETED':
                return 'Service Completed';
            case 'PARTNER_REASSIGNED':
                return 'Finding another Specialist...';
            case 'BOOKING_CANCELLED':
                return 'Booking Cancelled';
            default:
                return 'Serventica Order Update';
        }
    }
    getNotificationBody(eventType, payload) {
        switch (eventType) {
            case 'BOOKING_CONFIRMED':
                return `Your order has been confirmed. We are searching for nearby specialists.`;
            case 'PARTNER_ARRIVED':
                return 'Your service specialist has arrived at your doorstep.';
            case 'SERVICE_STARTED':
                return 'Service work is now in progress.';
            case 'SERVICE_COMPLETED':
                return 'Your service has been successfully completed. View invoice and review!';
            case 'PARTNER_REASSIGNED':
                return 'Reassigning a specialist to ensure immediate service.';
            case 'BOOKING_CANCELLED':
                return 'Your booking was cancelled. Any online payment will be refunded.';
            default:
                return 'Your booking status has been updated.';
        }
    }
};
exports.FulfillmentOutboxService = FulfillmentOutboxService;
exports.FulfillmentOutboxService = FulfillmentOutboxService = FulfillmentOutboxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [push_notification_service_1.PushNotificationService,
        tracking_gateway_1.TrackingGateway])
], FulfillmentOutboxService);
//# sourceMappingURL=fulfillment-outbox.service.js.map