"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const common_1 = require("@nestjs/common");
const helmet_1 = require("helmet");
const compression_1 = require("compression");
async function bootstrap() {
    const logger = new common_1.Logger('ServenticaApi');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    }));
    app.use((0, compression_1.default)({
        threshold: 1024,
        level: 6,
    }));
    app.enableCors({
        origin: [
            'http://localhost:8081',
            'http://10.0.2.2:8081',
            'exp://192.168.0.0/--/*',
            /\.serventica\.com$/,
        ],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: [
            'Authorization',
            'Content-Type',
            'X-Idempotency-Key',
            'X-Request-Id',
            'X-Client-Info',
            'X-Platform',
            'X-App-Version',
        ],
        credentials: true,
        maxAge: 86400,
    });
    app.use(require('express').json({ limit: '1mb' }));
    app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    app.enableShutdownHooks();
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 Serventica API server running on port ${port}`);
    logger.log(`📊 Rate limiting: 20/10s (burst) | 100/min (default) | 1000/hr (sustained)`);
    logger.log(`🔒 Helmet security headers enabled`);
    logger.log(`📦 Gzip compression enabled (threshold: 1KB)`);
}
bootstrap();
//# sourceMappingURL=main.js.map