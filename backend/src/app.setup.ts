/**
 * ==============================================================================
 * THIẾT LẬP CẤU HÌNH TOÀN CỤC (GLOBAL APPLICATION SETUP)
 * ==============================================================================
 * Vai trò:
 * - Bật CORS không giới hạn (credentials: true) cho phép điện thoại LAN và Tunnel truy cập.
 * - Cấu hình phục vụ file tĩnh: /uploads (audio MP3) và / (toàn bộ thư mục demo/).
 * - Kích hoạt ValidationPipe toàn cục để kiểm tra dữ liệu DTO đầu vào an toàn.
 * ==============================================================================
 */

import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function configureApp(app: NestExpressApplication) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const uploadsPaths = [
    join(process.cwd(), 'uploads'),
    join(process.cwd(), 'backend', 'uploads'),
    join(process.cwd(), '..', 'uploads'),
  ];
  const uploadsDir = uploadsPaths.find((p) => existsSync(p)) || join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Phục vụ trực tiếp thư mục tĩnh demo (index.html, qr.html, admin.html, api-client.js) ở root (/)
  const demoPaths = [
    join(process.cwd(), 'demo'),
    join(process.cwd(), '..', 'demo'),
    join(process.cwd(), 'backend', 'demo'),
    '/app/demo',
  ];
  const demoDir = demoPaths.find((p) => existsSync(p));
  if (demoDir) {
    app.useStaticAssets(demoDir, {
      prefix: '/',
    });
  }

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,x-admin-key,x-visitor-id,x-requested-with',
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: ['health', 'api/health', 'system/network-info', 'api/system/network-info'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hồ Chí Minh GPS Audio Guide API')
    .setDescription('Tài liệu API Thuyết minh Di tích Lịch sử TP.HCM theo Vị trí Địa lý (GPS)')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-admin-key', in: 'header' }, 'x-admin-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
}
