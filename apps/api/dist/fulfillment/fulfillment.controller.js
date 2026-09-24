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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FulfillmentController = void 0;
const common_1 = require("@nestjs/common");
const fulfillment_transaction_service_1 = require("./fulfillment-transaction.service");
let FulfillmentController = class FulfillmentController {
    constructor(fulfillmentService) {
        this.fulfillmentService = fulfillmentService;
    }
    async confirmBooking(body, idempotencyKey) {
        if (!body.bookingId || !body.customerId) {
            throw new common_1.BadRequestException('bookingId and customerId are required');
        }
        return this.fulfillmentService.confirmBooking({
            ...body,
            idempotencyKey: idempotencyKey || body.idempotencyKey,
        });
    }
    async acceptOffer(body) {
        if (!body.bookingId || !body.partnerId) {
            throw new common_1.BadRequestException('bookingId and partnerId are required');
        }
        return this.fulfillmentService.acceptOffer(body.bookingId, body.partnerId);
    }
    async reassignPartner(body) {
        if (!body.bookingId) {
            throw new common_1.BadRequestException('bookingId is required');
        }
        return this.fulfillmentService.reassignPartner(body);
    }
    async startService(body) {
        if (!body.bookingId || !body.partnerId) {
            throw new common_1.BadRequestException('bookingId and partnerId are required');
        }
        return this.fulfillmentService.startService(body);
    }
    async completeService(body) {
        if (!body.bookingId || !body.partnerId) {
            throw new common_1.BadRequestException('bookingId and partnerId are required');
        }
        return this.fulfillmentService.completeService(body);
    }
    async cancelBooking(body) {
        if (!body.bookingId) {
            throw new common_1.BadRequestException('bookingId is required');
        }
        return this.fulfillmentService.cancelBooking(body);
    }
};
exports.FulfillmentController = FulfillmentController;
__decorate([
    (0, common_1.Post)('confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "confirmBooking", null);
__decorate([
    (0, common_1.Post)('accept'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "acceptOffer", null);
__decorate([
    (0, common_1.Post)('reassign'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "reassignPartner", null);
__decorate([
    (0, common_1.Post)('start-service'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "startService", null);
__decorate([
    (0, common_1.Post)('complete-service'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "completeService", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FulfillmentController.prototype, "cancelBooking", null);
exports.FulfillmentController = FulfillmentController = __decorate([
    (0, common_1.Controller)('fulfillment'),
    __metadata("design:paramtypes", [fulfillment_transaction_service_1.FulfillmentTransactionService])
], FulfillmentController);
//# sourceMappingURL=fulfillment.controller.js.map