import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
const compression = require('compression');

/**
 * SERVENTICA — Production-Grade API Server Bootstrap
 *
 * Security & Performance Hardening for 200+ concurrent users:
 *   1. Helmet — Sets secure HTTP headers (XSS, clickjacking, MIME sniffing protection)
 *   2. Compression — Gzip/Brotli response compression (~70% bandwidth reduction)
 *   3. CORS — Origin-restricted cross-origin policy
 *   4. Rate Limiting — Multi-tier ThrottlerGuard (configured in AppModule)
 *   5. Request Size Limit — 1MB max body to prevent payload abuse
 *   6. Graceful Shutdown — Clean socket/DB teardown on SIGTERM
 */
async function bootstrap() {
  const logger = new Logger('ServenticaApi');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ── Security Headers ──────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for mobile API (no HTML served)
    crossOriginEmbedderPolicy: false,
  }));

  // ── Response Compression ──────────────────────────────────────
  app.use(compression({
    threshold: 1024, // Only compress responses > 1KB
    level: 6,        // Balanced speed vs compression ratio
  }));

  // ── CORS Configuration ────────────────────────────────────────
  app.enableCors({
    origin: [
      'http://localhost:8081',        // Expo Metro bundler
      'http://10.0.2.2:8081',         // Android emulator
      'exp://192.168.0.0/--/*',       // Expo Go on local network
      /\.serventica\.com$/,           // Production domains
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
    maxAge: 86400, // Cache preflight for 24 hours
  });

  // ── Request Body Size Limit ───────────────────────────────────
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));

  // ── Global Exception Filter ───────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Graceful Shutdown ─────────────────────────────────────────
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Serventica API server running on port ${port}`);
  logger.log(`📊 Rate limiting: 20/10s (burst) | 100/min (default) | 1000/hr (sustained)`);
  logger.log(`🔒 Helmet security headers enabled`);
  logger.log(`📦 Gzip compression enabled (threshold: 1KB)`);
}

bootstrap();
