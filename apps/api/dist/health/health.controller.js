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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const tracking_session_service_1 = require("../tracking/tracking-session.service");
const tracking_feature_flags_service_1 = require("../tracking/tracking-feature-flags.service");
let HealthController = class HealthController {
    constructor(trackingSessionService, featureFlagsService) {
        this.trackingSessionService = trackingSessionService;
        this.featureFlagsService = featureFlagsService;
    }
    getHealth() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'serventica-api',
        };
    }
    getReady() {
        return {
            status: 'ready',
            database: 'connected',
            socket: 'ready',
            timestamp: new Date().toISOString(),
        };
    }
    getTrackingHealth() {
        const metrics = this.trackingSessionService.getMetrics();
        const flags = this.featureFlagsService.getFlags();
        return {
            status: 'healthy',
            metrics,
            featureFlags: flags,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "getReady", null);
__decorate([
    (0, common_1.Get)('tracking'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "getTrackingHealth", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [tracking_session_service_1.TrackingSessionService,
        tracking_feature_flags_service_1.TrackingFeatureFlagsService])
], HealthController);
//# sourceMappingURL=health.controller.js.map