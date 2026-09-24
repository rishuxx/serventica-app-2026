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
exports.PushNotificationService = void 0;
const common_1 = require("@nestjs/common");
let PushNotificationService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var PushNotificationService = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            PushNotificationService = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        logger = new common_1.Logger(PushNotificationService.name);
        // In-memory idempotency deduplication cache: idempotencyKey -> timestamp
        sentIdempotencyKeys = new Map();
        // In-memory mock device token store: userId -> Set of push tokens
        userPushTokens = new Map();
        /**
         * Registers a push token for a user
         */
        registerDeviceToken(userId, token) {
            if (!userId || !token)
                return;
            const tokens = this.userPushTokens.get(userId) || new Set();
            tokens.add(token);
            this.userPushTokens.set(userId, tokens);
            this.logger.log(`[DeviceTokenRegistered] User ${userId} registered push token (total: ${tokens.size})`);
        }
        /**
         * Removes a push token (e.g. on logout or invalid token)
         */
        removeDeviceToken(userId, token) {
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
        async dispatchNotification(payload) {
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
            this.logger.log(`[PushDispatch] Event: ${payload.eventType} -> Recipient: ${payload.recipientId} | Title: "${payload.title}" | Body: "${payload.body}" | Tokens: ${tokens.length}`);
            // In production with Expo Push API, sends HTTP POST to https://exp.host/--/api/v2/push/send
            // If tokens is 0, payload is still queued / recorded in DB for in-app recovery
            return { dispatched: true };
        }
    };
    return PushNotificationService = _classThis;
})();
exports.PushNotificationService = PushNotificationService;
