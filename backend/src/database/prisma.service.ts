/**
 * ==============================================================================
 * DỊCH VỤ KẾT NỐI CSDL PRISMA & POSTGIS EXTENSION (DATABASE SERVICE)
 * ==============================================================================
 * Vai trò:
 * - Quản lý vòng đời kết nối PostgreSQL qua PrismaClient ($connect, $disconnect).
 * - Trong onModuleInit(), tự động thực thi 'CREATE EXTENSION IF NOT EXISTS postgis;'
 *   đảm bảo các hàm không gian địa lý luôn sẵn sàng hoạt động.
 * ==============================================================================
 */

import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');
    super({ adapter: new PrismaPg({ connectionString }) });
  }
  async onModuleInit() {
    await this.$connect();
    try {
      await this.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
    } catch {
      // Fallback an toàn nếu user DB không đủ quyền hoặc môi trường không hỗ trợ PostGIS
    }
  }
  async onModuleDestroy() { await this.$disconnect(); }
  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => void app.close());
  }
}

