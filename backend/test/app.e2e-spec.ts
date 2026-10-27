import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Language,
  ListeningMode,
  PassStatus,
  PoiStatus,
  PrismaClient,
} from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

type HttpResponse = { body: Record<string, unknown> };

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled =
  process.env.RUN_INTEGRATION_TESTS === 'true' && Boolean(testDatabaseUrl);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration('GPS Guide API Integration (E2E)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaClient;
  const adminKey = 'DEMO_ADMIN_KEY_2026';
  let poiId: string;

  beforeAll(async () => {
    assertSafeTestDatabase(testDatabaseUrl!);
    process.env.DATABASE_URL = testDatabaseUrl!;
    process.env.ADMIN_KEY = adminKey;
    process.env.NODE_ENV = 'test';

    prisma = new PrismaClient();

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    const poi = await prisma.poi.create({
      data: {
        name: 'Chùa Linh Ứng Bãi Bụt',
        description: 'Ngôi chùa linh thiêng tại bán đảo Sơn Trà',
        latitude: 16.10699,
        longitude: 108.27354,
        category: 'Tâm linh',
        activationRadius: 40,
        priority: 10,
        status: PoiStatus.DRAFT,
        narrations: {
          create: {
            language: Language.vi,
            title: 'Chùa Linh Ứng',
            content: 'Giới thiệu về Chùa Linh Ứng Bãi Bụt Sơn Trà',
            durationSeconds: 180,
          },
        },
      },
    });
    poiId = poi.id;
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('lấy trạng thái hệ thống thành công qua GET /', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(({ body }: HttpResponse) => {
        expect(body.status).toBe('ok');
        expect(body.time).toBeDefined();
      });
  });

  it('từ chối truy cập API Admin khi không có hoặc sai x-admin-key', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/pois/${poiId}/status`)
      .send({ status: PoiStatus.PUBLISHED })
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/admin/pois/${poiId}/status`)
      .set('x-admin-key', 'wrong-key')
      .send({ status: PoiStatus.PUBLISHED })
      .expect(401);
  });

  it('cho phép Admin cập nhật trạng thái POI và xóa POI khi có x-admin-key hợp lệ', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/pois/${poiId}/status`)
      .set('x-admin-key', adminKey)
      .send({ status: PoiStatus.PUBLISHED })
      .expect(200)
      .expect(({ body }: HttpResponse) => {
        expect(body.status).toBe(PoiStatus.PUBLISHED);
      });

    await request(app.getHttpServer())
      .delete(`/admin/pois/${poiId}`)
      .set('x-admin-key', adminKey)
      .expect(200);

    const deleted = await prisma.poi.findUnique({ where: { id: poiId } });
    expect(deleted).toBeNull();
  });

  it('trả về danh sách POI lân cận theo tọa độ GPS qua GET /pois/nearby', async () => {
    await prisma.poi.update({
      where: { id: poiId },
      data: { status: PoiStatus.PUBLISHED },
    });

    await request(app.getHttpServer())
      .get('/pois/nearby')
      .query({
        lat: 16.10699,
        lng: 108.27354,
        radiusM: 500,
        language: 'vi',
      })
      .expect(200)
      .expect(({ body }: HttpResponse) => {
        const items = body.items as Array<{ id: string; name: string; distanceM: number }>;
        expect(items).toBeDefined();
        expect(items.length).toBeGreaterThan(0);
        expect(items[0].id).toBe(poiId);
        expect(items[0].distanceM).toBeLessThan(10);
      });
  });

  it('kích hoạt AccessPass hợp lệ và từ chối mã không tồn tại', async () => {
    await prisma.accessPass.create({
      data: {
        code: 'DEMO-2026',
        status: PassStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
      },
    });

    await request(app.getHttpServer())
      .post('/access-passes/activate')
      .send({ code: 'DEMO-2026', deviceInfo: 'iOS-Mobile-Safari' })
      .expect(201)
      .expect(({ body }: HttpResponse) => {
        expect(body.pass).toMatchObject({
          code: 'DEMO-2026',
          status: PassStatus.ACTIVE,
        });
      });

    await request(app.getHttpServer())
      .post('/access-passes/activate')
      .send({ code: 'INVALID-CODE', deviceInfo: 'Android-Chrome' })
      .expect(404);
  });

  it('ghi nhận sự kiện nghe thuyết minh qua POST /listening/events', async () => {
    await prisma.poi.update({
      where: { id: poiId },
      data: { status: PoiStatus.PUBLISHED },
    });

    await request(app.getHttpServer())
      .post('/listening/events')
      .send({
        poiId,
        language: Language.vi,
        mode: ListeningMode.AUTO,
        latitude: 16.10699,
        longitude: 108.27354,
        visitorId: 'visitor-e2e-test',
      })
      .expect(201)
      .expect(({ body }: HttpResponse) => {
        expect(body.id).toBeDefined();
        expect(body.mode).toBe(ListeningMode.AUTO);
      });
  });
});

function assertSafeTestDatabase(url: string) {
  const databaseName = new URL(url).pathname.replace(/^\//, '');
  if (!databaseName.toLowerCase().includes('test')) {
    throw new Error("TEST_DATABASE_URL must target a database containing 'test'");
  }
}

async function resetDatabase(prisma: PrismaClient) {
  await prisma.listeningEvent.deleteMany();
  await prisma.narration.deleteMany();
  await prisma.tourStop.deleteMany();
  await prisma.tour.deleteMany();
  await prisma.accessPass.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.poi.deleteMany();
}
