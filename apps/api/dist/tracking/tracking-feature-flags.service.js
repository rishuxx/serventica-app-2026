"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TrackingFeatureFlagsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingFeatureFlagsService = void 0;
const common_1 = require("@nestjs/common");
let TrackingFeatureFlagsService = TrackingFeatureFlagsService_1 = class TrackingFeatureFlagsService {
    constructor() {
        this.logger = new common_1.Logger(TrackingFeatureFlagsService_1.name);
        this.flags = {
            geofenceArrivalEnabled: process.env.FEATURE_GEOFENCE_ARRIVAL !== 'false',
            pushNotificationsEnabled: process.env.FEATURE_PUSH_NOTIFICATIONS !== 'false',
            strictJumpRejection: process.env.FEATURE_STRICT_JUMP_REJECTION !== 'false',
            debouncedPersistenceEnabled: process.env.FEATURE_DEBOUNCED_PERSISTENCE !== 'false',
            maxAccuracyMeters: Number(process.env.TRACKING_MAX_ACCURACY_METERS || 100),
        };
    }
    getFlags() {
        return { ...this.flags };
    }
    isGeofenceArrivalEnabled() {
        return this.flags.geofenceArrivalEnabled;
    }
    isPushNotificationsEnabled() {
        return this.flags.pushNotificationsEnabled;
    }
    isStrictJumpRejectionEnabled() {
        return this.flags.strictJumpRejection;
    }
    isDebouncedPersistenceEnabled() {
        return this.flags.debouncedPersistenceEnabled;
    }
    updateFlags(partial) {
        this.flags = { ...this.flags, ...partial };
        this.logger.log(`[FeatureFlagsUpdated] Updated: ${JSON.stringify(partial)}`);
    }
};
exports.TrackingFeatureFlagsService = TrackingFeatureFlagsService;
exports.TrackingFeatureFlagsService = TrackingFeatureFlagsService = TrackingFeatureFlagsService_1 = __decorate([
    (0, common_1.Injectable)()
], TrackingFeatureFlagsService);
//# sourceMappingURL=tracking-feature-flags.service.js.map