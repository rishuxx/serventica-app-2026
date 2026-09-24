"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentOutboxService = void 0;
const common_1 = require("@nestjs/common");
/**
 * SERVENTICA — Fulfillment Outbox Service (Phase 7)
 * Implements the Transactional Outbox Pattern:
 * Consumes pending domain events committed inside PostgreSQL transactions,
 * routing them reliably to Socket.IO tracking rooms, Push Notifications, and Audit logging.
 */
let FulfillmentOutboxService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var FulfillmentOutboxService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            FulfillmentOutboxService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        pushNotifications;
        trackingGateway;
        logger = new common_1.Logger(FulfillmentOutboxService.name);
        isProcessing = false;
        // In-memory queue fallback for offline/direct testing
        inMemoryQueue = [];
        constructor(pushNotifications, trackingGateway) {
            this.pushNotifications = pushNotifications;
            this.trackingGateway = trackingGateway;
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
            // 1. Broadcast over Socket.IO tracking room if gateway is active
            try {
                this.trackingGateway.handleStatusUpdate({ id: 'system_outbox' }, { bookingId: booking_id, status: event_type });
            }
            catch (e) {
                // Ignored if socket room not active yet
            }
            // 2. Dispatch push notification if recipient is identified
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
    return FulfillmentOutboxService = _classThis;
})();
exports.FulfillmentOutboxService = FulfillmentOutboxService;
