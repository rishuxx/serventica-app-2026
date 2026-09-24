"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingModule = void 0;
const common_1 = require("@nestjs/common");
const tracking_gateway_1 = require("./tracking.gateway");
const tracking_session_service_1 = require("./tracking-session.service");
const location_validation_service_1 = require("./location-validation.service");
const geofence_service_1 = require("./geofence.service");
const push_notification_service_1 = require("./push-notification.service");
const tracking_feature_flags_service_1 = require("./tracking-feature-flags.service");
let TrackingModule = class TrackingModule {
};
exports.TrackingModule = TrackingModule;
exports.TrackingModule = TrackingModule = __decorate([
    (0, common_1.Module)({
        providers: [
            tracking_gateway_1.TrackingGateway,
            tracking_session_service_1.TrackingSessionService,
            location_validation_service_1.LocationValidationService,
            geofence_service_1.GeofenceService,
            push_notification_service_1.PushNotificationService,
            tracking_feature_flags_service_1.TrackingFeatureFlagsService,
        ],
        exports: [
            tracking_gateway_1.TrackingGateway,
            tracking_session_service_1.TrackingSessionService,
            location_validation_service_1.LocationValidationService,
            geofence_service_1.GeofenceService,
            push_notification_service_1.PushNotificationService,
            tracking_feature_flags_service_1.TrackingFeatureFlagsService,
        ],
    })
], TrackingModule);
//# sourceMappingURL=tracking.module.js.map