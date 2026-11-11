# Nhiệm vụ: Tách TranslationRepository & API Tour Package Offline (UC8)
**Giao cho:** Trung (Translation & Tour Package)  
**Dự án:** Hồ Chí Minh GPS Audio Guide (`DA_CNPM`)  
**Mục tiêu:** Đưa Translation module về chuẩn 3 lớp nghiêm ngặt (tách Repository khỏi Service) và xây dựng endpoint tải trọn gói dữ liệu Tour ngoại tuyến (`GET /api/tours/:id/package`).

---

## 1. Danh sách file cần sửa / tạo mới
- `backend/src/translation/translation.repository.ts` (Tạo mới)
- `backend/src/translation/translation.service.ts` (Chỉnh sửa)
- `backend/src/translation/translation.module.ts` (Chỉnh sửa)
- `backend/src/tour/tour.repository.ts` (Chỉnh sửa)
- `backend/src/tour/tour.service.ts` (Chỉnh sửa)
- `backend/src/tour/tour.controller.ts` (Chỉnh sửa)
- `backend/test/translation.service.spec.ts` (Tạo mới)
- `backend/test/tour.service.spec.ts` (Chỉnh sửa bổ sung)

---

## 2. Chi tiết công việc

### Task 2.1: Tách `TranslationRepository` (Chuẩn 3 lớp)
Hiện tại `TranslationService` đang gọi trực tiếp `PrismaService` (vi phạm kiến trúc). Cần tạo riêng tầng Data Access:

#### Bước 2.1.1: Tạo `backend/src/translation/translation.repository.ts`
Chuyển toàn bộ các lệnh đọc `LanguageCatalog` và `Narration` về file này:

```typescript
// backend/src/translation/translation.repository.ts

import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class TranslationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLanguages() {
    return this.prisma.languageCatalog.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  findNarration(poiId: string, language: Language) {
    return this.prisma.narration.findUnique({
      where: { poiId_language: { poiId, language } },
    });
  }
}
```

#### Bước 2.1.2: Refactor `backend/src/translation/translation.service.ts`
Inject `TranslationRepository` thay cho `PrismaService`:

```typescript
// backend/src/translation/translation.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { Language } from '@prisma/client';
import { TranslationRepository } from './translation.repository.js';

@Injectable()
export class TranslationService {
  constructor(private readonly repository: TranslationRepository) {}

  async languages() {
    const list = await this.repository.findLanguages();
    if (list.length > 0) return list;

    // Fallback nếu database chưa chạy seed
    return [
      { code: 'vi', nameVi: 'Tiếng Việt', nameEn: 'Vietnamese', nativeName: 'Tiếng Việt', flagEmoji: '🇻🇳', isAvailable: true, sortOrder: 1 },
      { code: 'en', nameVi: 'Tiếng Anh', nameEn: 'English', nativeName: 'English', flagEmoji: '🇬🇧', isAvailable: true, sortOrder: 2 },
      { code: 'zh', nameVi: 'Tiếng Trung (Giản thể)', nameEn: 'Chinese (Simplified)', nativeName: '中文（简体）', flagEmoji: '🇨🇳', isAvailable: true, sortOrder: 3 },
      { code: 'ja', nameVi: 'Tiếng Nhật', nameEn: 'Japanese', nativeName: '日本語', flagEmoji: '🇯🇵', isAvailable: true, sortOrder: 5 },
      { code: 'ko', nameVi: 'Tiếng Hàn', nameEn: 'Korean', nativeName: '한국어', flagEmoji: '🇰🇷', isAvailable: true, sortOrder: 6 },
    ];
  }

  async narration(poiId: string, language: Language) {
    const narration = await this.repository.findNarration(poiId, language);
    if (!narration) {
      throw new NotFoundException(`Nội dung thuyết minh cho ngôn ngữ [${language}] chưa khả dụng.`);
    }
    return narration;
  }
}
```

#### Bước 2.1.3: Cập nhật `backend/src/translation/translation.module.ts`
Khai báo `TranslationRepository` vào mảng `providers` và `exports`:

```typescript
// backend/src/translation/translation.module.ts

import { Module } from '@nestjs/common';
import { TranslationController } from './translation.controller.js';
import { TranslationRepository } from './translation.repository.js';
import { TranslationService } from './translation.service.js';

@Module({
  controllers: [TranslationController],
  providers: [TranslationService, TranslationRepository],
  exports: [TranslationService, TranslationRepository],
})
export class TranslationModule {}
```

---

### Task 2.2: Xây dựng API Tour Package ngoại tuyến (UC8)
Khách du lịch cần tải trọn gói dữ liệu một tour (bao gồm thông tin Tour, danh sách Điểm dừng Stops, danh sách POI đầy đủ và bản dịch/audio tương ứng) để lưu vào IndexedDB/LocalStorage và nghe offline.

#### Bước 2.2.1: Bổ sung hàm `findTourPackage` trong `backend/src/tour/tour.repository.ts`
```typescript
// Thêm vào cuối file backend/src/tour/tour.repository.ts

/**
 * UC8: Tải trọn gói dữ liệu Tour ngoại tuyến (Offline Package)
 */
async findTourPackage(tourId: string, language: Language = Language.vi) {
  const tour = await this.prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      stops: {
        orderBy: { position: 'asc' },
        include: {
          poi: {
            include: {
              narrations: { where: { language } },
            },
          },
        },
      },
    },
  });

  if (!tour) return null;

  const stops = tour.stops || [];
  const pois = stops.map((s) => s.poi).filter(Boolean);

  return {
    tour: {
      id: tour.id,
      name: tour.name,
      description: tour.description,
      isSuggested: tour.isSuggested,
      estimatedMinutes: tour.estimatedMinutes,
      totalStops: stops.length,
    },
    language,
    downloadedAt: new Date().toISOString(),
    stops: stops.map((s) => ({
      id: s.id,
      position: s.position,
      poiId: s.poiId,
    })),
    pois: pois.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      latitude: p.latitude,
      longitude: p.longitude,
      category: p.category,
      address: p.address,
      activationRadius: p.activationRadius,
      priority: p.priority,
      imageUrl: p.imageUrl,
      status: p.status,
      narration: p.narrations?.[0] ?? null,
    })),
  };
}
```

#### Bước 2.2.2: Bổ sung method `getPackage` trong `backend/src/tour/tour.service.ts`
```typescript
// Thêm vào backend/src/tour/tour.service.ts

async getPackage(id: string, language: Language = Language.vi) {
  const pkg = await this.repository.findTourPackage(id, language);
  if (!pkg) {
    throw new NotFoundException(`Tour với ID [${id}] không tồn tại.`);
  }
  return pkg;
}
```

#### Bước 2.2.3: Bổ sung route trong `backend/src/tour/tour.controller.ts`
Đặt route `:id/package` trước `:id` để tránh nhầm lẫn pattern:

```typescript
// Thêm vào backend/src/tour/tour.controller.ts

/**
 * UC8: Tải gói dữ liệu tour ngoại tuyến
 * GET /api/tours/:id/package?language=vi
 */
@Get(':id/package')
getPackage(@Param('id') id: string, @Query() query: TourQueryDto) {
  return this.tours.getPackage(id, query.language);
}
```

---

### Task 2.3: Viết Unit Test cho 2 Module

#### File test 1: `backend/test/translation.service.spec.ts`
```typescript
import { describe, expect, it, vi } from 'vitest';
import { Language } from '@prisma/client';
import { TranslationService } from '../src/translation/translation.service.js';
import type { TranslationRepository } from '../src/translation/translation.repository.js';

describe('TranslationService (3-Tier)', () => {
  const mockLanguages = [
    { code: 'vi', nameVi: 'Tiếng Việt', nameEn: 'Vietnamese', nativeName: 'Tiếng Việt', flagEmoji: '🇻🇳', isAvailable: true, sortOrder: 1 },
  ];

  it('lấy danh sách ngôn ngữ qua TranslationRepository', async () => {
    const findLanguagesSpy = vi.fn().mockResolvedValue(mockLanguages);
    const mockRepo = {
      findLanguages: findLanguagesSpy,
      findNarration: vi.fn(),
    } as unknown as TranslationRepository;

    const service = new TranslationService(mockRepo);
    const result = await service.languages();

    expect(result).toHaveLength(1);
    expect(findLanguagesSpy).toHaveBeenCalledTimes(1);
  });

  it('trả về bản dịch khi tồn tại trong repository', async () => {
    const mockNarration = {
      id: 'n1',
      poiId: 'poi-1',
      language: Language.vi,
      title: 'Dinh Độc Lập',
      content: 'Nội dung thuyết minh...',
      durationSeconds: 180,
    };
    const mockRepo = {
      findLanguages: vi.fn(),
      findNarration: vi.fn().mockResolvedValue(mockNarration),
    } as unknown as TranslationRepository;

    const service = new TranslationService(mockRepo);
    const result = await service.narration('poi-1', Language.vi);

    expect(result.title).toBe('Dinh Độc Lập');
  });

  it('ném lỗi NotFoundException khi bản dịch không tồn tại', async () => {
    const mockRepo = {
      findLanguages: vi.fn(),
      findNarration: vi.fn().mockResolvedValue(null),
    } as unknown as TranslationRepository;

    const service = new TranslationService(mockRepo);
    await expect(service.narration('poi-1', Language.ko)).rejects.toThrowError('chưa khả dụng');
  });
});
```

#### File test 2: Bổ sung case vào `backend/test/tour.service.spec.ts`
```typescript
// Bổ sung vào describe trong backend/test/tour.service.spec.ts

it('tải trọn gói dữ liệu Tour ngoại tuyến (UC8 - package) thành công', async () => {
  mockRepository.findTourPackage = vi.fn().mockResolvedValue({
    tour: mockTour,
    language: Language.vi,
    downloadedAt: new Date().toISOString(),
    stops: mockTour.stops,
    pois: mockPois,
  });

  const pkg = await service.getPackage('tour-1', Language.vi);
  expect(pkg).toBeDefined();
  expect(pkg.tour.id).toBe('tour-1');
  expect(pkg.pois).toHaveLength(2);
});

it('ném lỗi NotFoundException khi tải package của tour không tồn tại', async () => {
  mockRepository.findTourPackage = vi.fn().mockResolvedValue(null);
  await expect(service.getPackage('invalid-id')).rejects.toThrowError('không tồn tại');
});
```

---

## 3. Định nghĩa hoàn thành (Definition of Done)
1. `npm --prefix backend run test` chạy pass toàn bộ test suites (`test/translation.service.spec.ts` và `test/tour.service.spec.ts`).
2. `npm --prefix backend run lint` không báo lỗi `unbound-method` hay unused import.
3. Chạy backend cục bộ và test cURL:
   ```bash
   curl "http://localhost:3000/api/tours/tour-sai-gon-di-san/package?language=vi"
   ```
   Kết quả trả về HTTP 200 kèm JSON đầy đủ các trường: `tour`, `stops`, `pois`, `downloadedAt`.
4. Không có bất kỳ dòng lệnh nào trong `TranslationService` truy cập trực tiếp `prisma.*`.

