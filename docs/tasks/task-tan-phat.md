# Nhiệm vụ: Hạ tầng PostGIS, Routing & Health Check
**Giao cho:** Lê Tấn Phát (Lead)  
**Dự án:** Hồ Chí Minh GPS Audio Guide (`DA_CNPM`)  
**Mục tiêu:** Nâng cấp truy vấn không gian PostGIS có fallback an toàn, cố định routing không làm gãy giao diện demo, và hoàn thiện health check kiểm tra kết nối database thực tế.

---

## 1. Danh sách file cần sửa / tạo mới
- `docker-compose.yml`
- `backend/src/poi/poi.repository.ts`
- `backend/src/main.ts`
- `backend/src/app.setup.ts`
- `backend/src/app.controller.ts`
- `backend/test/app.controller.spec.ts`

---

## 2. Chi tiết công việc

### Task 1.1: Đổi image PostgreSQL sang PostGIS (`docker-compose.yml`)
Trong `docker-compose.yml`, cập nhật service `db` để dùng image PostGIS chính thức, phục vụ truy vấn không gian `ST_DWithin` và `ST_DistanceSphere`:

```yaml
services:
  db:
    image: postgis/postgis:16-3.4-alpine
    container_name: da_cnpm-db-1
    environment:
      POSTGRES_DB: linh_ung
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d linh_ung"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
```

Kích hoạt extension PostGIS trong container (chạy lệnh này sau khi start container):
```bash
docker exec -it da_cnpm-db-1 psql -U postgres -d linh_ung -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

---

### Task 1.2: Cài đặt Hybrid Fallback trong `PoiRepository.findNearby` (`backend/src/poi/poi.repository.ts`)
Viết lại hàm `findNearby` thành 2 tầng:
1. **Tầng 1 (PostGIS Native SQL):** Dùng `this.prisma.$queryRaw` với `ST_DWithin` và `ST_DistanceSphere` JOIN `Narration` theo ngôn ngữ chỉ định.
2. **Tầng 2 (Haversine Fallback):** Bọc Tầng 1 trong `try/catch`. Nếu DB chưa bật PostGIS hoặc khi chạy Unit Test với Mock DB, tự động chạy thuật toán Haversine in-memory.

```typescript
// backend/src/poi/poi.repository.ts

async findNearby(
  lat: number,
  lng: number,
  radiusM = 500,
  language: Language = Language.vi,
): Promise<NearbyPoiCandidate[]> {
  // Tầng 1: PostGIS raw spatial query
  try {
    type RawSpatialPoi = {
      id: string;
      name: string;
      description: string;
      latitude: number;
      longitude: number;
      category: string;
      address: string | null;
      activationRadius: number;
      priority: number;
      imageUrl: string | null;
      distanceM: number;
      narrationId: string | null;
      narrationLang: string | null;
      narrationTitle: string | null;
      narrationContent: string | null;
      narrationAudioUrl: string | null;
      narrationDuration: number | null;
    };

    const rawResults = await this.prisma.$queryRaw<RawSpatialPoi[]>`
      SELECT 
        p.id, p.name, p.description, p.latitude, p.longitude, p.category, p.address,
        p."activationRadius", p.priority, p."imageUrl",
        ROUND(CAST(ST_DistanceSphere(ST_MakePoint(p.longitude, p.latitude), ST_MakePoint(${lng}, ${lat})) AS numeric), 2) AS "distanceM",
        n.id AS "narrationId",
        n.language AS "narrationLang",
        n.title AS "narrationTitle",
        n.content AS "narrationContent",
        n."audioUrl" AS "narrationAudioUrl",
        n."durationSeconds" AS "narrationDuration"
      FROM "Poi" p
      LEFT JOIN "Narration" n ON n."poiId" = p.id AND n.language = ${language}::"Language"
      WHERE p.status = 'PUBLISHED'
        AND ST_DWithin(
          ST_MakePoint(p.longitude, p.latitude)::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusM}
        )
      ORDER BY p.priority DESC, "distanceM" ASC
    `;

    if (rawResults && Array.isArray(rawResults)) {
      return rawResults.map((r) => {
        const triggerRadiusM = Number(r.activationRadius);
        const distanceM = Number(r.distanceM);
        return {
          id: r.id,
          name: r.name,
          description: r.description,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          category: r.category,
          address: r.address,
          activationRadius: triggerRadiusM,
          priority: Number(r.priority),
          imageUrl: r.imageUrl,
          distanceM,
          triggerRadiusM,
          resetRadiusM: Math.round(triggerRadiusM * 1.5 * 100) / 100,
          narration: r.narrationId
            ? {
                id: r.narrationId,
                language: (r.narrationLang as Language) || language,
                title: r.narrationTitle || '',
                content: r.narrationContent || '',
                audioUrl: r.narrationAudioUrl,
                durationSeconds: r.narrationDuration ? Number(r.narrationDuration) : null,
              }
            : null,
        };
      });
    }
  } catch {
    // DB chưa có extension PostGIS -> nhảy xuống Tầng 2
  }

  // Tầng 2: Fallback in-memory bằng Haversine
  const pois = await this.prisma.poi.findMany({
    where: { status: PoiStatus.PUBLISHED },
    include: {
      narrations: { where: { language } },
    },
  });

  const candidates: NearbyPoiCandidate[] = [];
  for (const poi of pois) {
    const distanceM = this.haversine(lat, lng, poi.latitude, poi.longitude);
    if (distanceM <= radiusM) {
      const triggerRadiusM = poi.activationRadius;
      candidates.push({
        id: poi.id,
        name: poi.name,
        description: poi.description,
        latitude: poi.latitude,
        longitude: poi.longitude,
        category: poi.category,
        address: poi.address,
        activationRadius: triggerRadiusM,
        priority: poi.priority,
        imageUrl: poi.imageUrl,
        distanceM: Math.round(distanceM * 100) / 100,
        triggerRadiusM,
        resetRadiusM: Math.round(triggerRadiusM * 1.5 * 100) / 100,
        narration: poi.narrations[0]
          ? {
              id: poi.narrations[0].id,
              language: poi.narrations[0].language,
              title: poi.narrations[0].title,
              content: poi.narrations[0].content,
              audioUrl: poi.narrations[0].audioUrl,
              durationSeconds: poi.narrations[0].durationSeconds,
            }
          : null,
      });
    }
  }

  return candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.distanceM - b.distanceM;
  });
}
```

---

### Task 1.3: Cố định Routing & Swagger (`app.setup.ts` & `main.ts`)
Frontend trong `demo/` gọi thẳng `/api/...`. Tuyệt đối không đổi global prefix thành `/api/v1` mà phải giữ `'api'`, dùng `exclude` để đưa `/health` ra root path:

**`backend/src/app.setup.ts`:**
```typescript
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

export function configureApp(app: INestApplication) {
  app.use(helmet({ contentSecurityPolicy: false }));

  const rawOrigins = process.env.CORS_ORIGINS || '';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Giữ prefix 'api', exclude health và network-info để container/probe gọi trực tiếp
  app.setGlobalPrefix('api', {
    exclude: ['health', 'api/health', 'system/network-info', 'api/system/network-info'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hồ Chí Minh GPS Audio Guide API')
    .setDescription('Tài liệu API Thuyết minh Di tích Lịch sử TP.HCM (GPS)')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-admin-key', in: 'header' }, 'x-admin-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
}
```

**`backend/src/main.ts`:**
```typescript
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API: http://localhost:${port}/api`);
  console.log(`📚 Swagger: http://localhost:${port}/docs`);
  console.log(`💓 Health: http://localhost:${port}/health`);
}
void bootstrap();
```

---

### Task 1.4: Health Check kiểm tra kết nối DB (`AppController`)
Trong `backend/src/app.controller.ts`, inject `PrismaService` và thực thi truy vấn ping `SELECT 1`:

```typescript
// backend/src/app.controller.ts

import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import * as os from 'node:os';
import { PrismaService } from './database/prisma.service.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(['health', 'api/health'])
  async health() {
    let dbStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
  
  // getNetworkInfo giữ nguyên logic lấy LAN IP
}
```

Tạo file test `backend/test/app.controller.spec.ts`:
```typescript
import { describe, expect, it, vi } from 'vitest';
import { AppController } from '../src/app.controller.js';
import type { PrismaService } from '../src/database/prisma.service.js';

describe('AppController (Health Check)', () => {
  it('trả về status ok và database connected khi ping DB thành công', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;

    const controller = new AppController(mockPrisma);
    const result = await controller.health();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(typeof result.uptime).toBe('number');
  });

  it('trả về database disconnected khi ping DB lỗi (không crash server)', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('DB down')),
    } as unknown as PrismaService;

    const controller = new AppController(mockPrisma);
    const result = await controller.health();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('disconnected');
  });
});
```

---

## 3. Định nghĩa hoàn thành (Definition of Done)
1. `npm --prefix backend run test` chạy pass toàn bộ test suite, bao gồm `test/app.controller.spec.ts` và `test/geo-nearby.service.spec.ts`.
2. Khởi động backend (`npm run start:dev` hoặc Docker):
   - `curl http://localhost:3000/health` trả về HTTP 200 kèm body `{"status":"ok","database":"connected",...}`.
   - `curl http://localhost:3000/api/health` trả về kết quả tương đương.
3. Mở `http://localhost:3000/docs` hiển thị giao diện Swagger UI với đầy đủ endpoints và auth header `x-admin-key`.
4. Mở `demo/index.html` kiểm tra tính năng GPS / Nearby POI vẫn hoạt động bình thường, không dính lỗi 404.
