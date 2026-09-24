"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PushNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationService = void 0;
const common_1 = require("@nestjs/common");
let PushNotificationService = PushNotificationService_1 = class PushNotificationService {
    constructor() {
        this.logger = new common_1.Logger(PushNotificationService_1.name);
        this.sentIdempotencyKeys = new Map();
        this.userPushTokens = new Map();
    }
    registerDeviceToken(userId, token) {
        if (!userId || !token)
            return;
        const tokens = this.userPushTokens.get(userId) || new Set();
        tokens.add(token);
        this.userPushTokens.set(userId, tokens);
        this.logger.log(`[DeviceTokenRegistered] User ${userId} registered push token (total: ${tokens.size})`);
    }
    removeDeviceToken(userId, token) {
        const tokens = this.userPushTokens.get(userId);
        if (tokens) {
            tokens.delete(token);
            if (tokens.size === 0) {
                this.userPushTokens.delete(userId);
            }
        }
    }
    async dispatchNotification(payload) {
        const key = payload.idempotencyKey || `${payload.bookingId}:${payload.eventType}`;
        if (this.sentIdempotencyKeys.has(key)) {
            this.logger.debug(`[PushDeduplicated] Notification with key '${key}' already dispatched. Skipping.`);
            return { dispatched: false, reason: 'IDEMPOTENCY_DEDUPLICATED' };
        }
        const tokensSet = this.userPushTokens.get(payload.recipientId);
        const tokens = tokensSet ? Array.from(tokensSet) : [];
        this.sentIdempotencyKeys.set(key, Date.now());
        this.logger.log(`[PushDispatch] Event: ${payload.eventType} -> Recipient: ${payload.recipientId} | Title: "${payload.title}" | Body: "${payload.body}" | Tokens: ${tokens.length}`);
        return { dispatched: true };
    }
};
exports.PushNotificationService = PushNotificationService;
exports.PushNotificationService = PushNotificationService = PushNotificationService_1 = __decorate([
    (0, common_1.Injectable)()
], PushNotificationService);
//# sourceMappingURL=push-notification.service.js.map