"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const logger = new common_1.Logger('ServenticaApi');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    app.enableCors();
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Serventica API server running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map