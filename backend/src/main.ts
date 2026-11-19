/**
 * ==============================================================================
 * ĐIỂM KHỞI ĐỘNG ỨNG DỤNG BACKEND (APPLICATION BOOTSTRAP)
 * ==============================================================================
 * Vai trò:
 * - Nạp biến môi trường từ .env (hỗ trợ cả thư mục gốc và thư mục backend).
 * - Khởi tạo NestJS Application, cấu hình Middleware bảo mật, tiền tố API (/api).
 * - Lắng nghe tại cổng PORT (mặc định 3000) trên mọi giao diện mạng (0.0.0.0).
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load .env from multiple potential locations (workspace root, backend dir, parent dir)
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend API running on http://0.0.0.0:${port}/api`);
  console.log(`📱 Visitor App ready at http://localhost:${port}/index.html`);
  console.log(`🖨️ QR Standee ready at http://localhost:${port}/qr.html`);
  console.log(`📊 Admin Dashboard ready at http://localhost:${port}/admin.html`);
  console.log(`📚 Swagger documentation ready at http://localhost:${port}/docs`);
  console.log(`💓 Health check ready at http://localhost:${port}/health`);
}
void bootstrap();
