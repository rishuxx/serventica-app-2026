"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const customers_controller_1 = require("./customers/customers.controller");
const health_controller_1 = require("./health/health.controller");
const tracking_module_1 = require("./tracking/tracking.module");
const fulfillment_module_1 = require("./fulfillment/fulfillment.module");
const finance_module_1 = require("./finance/finance.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot([
                {
                    name: 'short',
                    ttl: 10_000,
                    limit: 20,
                },
                {
                    name: 'default',
                    ttl: 60_000,
                    limit: 100,
                },
                {
                    name: 'long',
                    ttl: 3_600_000,
                    limit: 1000,
                },
            ]),
            tracking_module_1.TrackingModule,
            fulfillment_module_1.FulfillmentModule,
            finance_module_1.FinanceModule,
        ],
        controllers: [customers_controller_1.CustomersController, health_controller_1.HealthController],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map