# Nhiệm vụ: AI Chatbot RAG Knowledge & Rate Limiting (UC4)
**Giao cho:** Như Phát (AI Chatbot RAG & Rate Limit)  
**Dự án:** Hồ Chí Minh GPS Audio Guide (`DA_CNPM`)  
**Mục tiêu:** Nâng cấp AI Chatbot từ câu trả lời mock tĩnh sang cơ chế Retrieval-Augmented Generation (RAG) tra cứu từ kho dữ liệu POI đã được duyệt (`status: PUBLISHED`), đồng thời áp dụng `RateLimitGuard` để chặn spam kỹ thuật (20 req/phút).

---

## 1. Danh sách file cần sửa / tạo mới
- `backend/src/poi/poi.repository.ts` (Bổ sung hàm tìm kiếm kiến thức)
- `backend/src/auth/auth.module.ts` (Tạo mới)
- `backend/src/auth/rate-limit.guard.ts` (Rà soát logic bộ đếm bộ nhớ)
- `backend/src/chatbot/chatbot.service.ts` (Refactor RAG)
- `backend/src/chatbot/chatbot.controller.ts` (Gắn Guard & Decorator)
- `backend/src/chatbot/chatbot.module.ts` (Import PoiModule & AuthModule)
- `backend/test/chatbot.service.spec.ts` (Cập nhật Unit Test)
- `backend/test/app.e2e-spec.ts` (Cập nhật E2E test)

---

## 2. Chi tiết công việc

### Task 3.1: Thêm hàm tìm kiếm POI đã duyệt trong `PoiRepository`
Trong `backend/src/poi/poi.repository.ts`, thêm hàm `findPublishedForKnowledge` để lấy các POI `PUBLISHED` kèm các bản dịch (`narrations`), phục vụ làm context cho Chatbot:

```typescript
// Thêm vào backend/src/poi/poi.repository.ts

/**
 * Tìm kiếm các POI đã PUBLISHED phục vụ truy vấn tri thức RAG của AI Guide
 */
findPublishedForKnowledge(query?: string) {
  return this.prisma.poi.findMany({
    where: {
      status: PoiStatus.PUBLISHED,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { address: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      narrations: true,
    },
    orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    take: 5,
  });
}
```

---

### Task 3.2: Đóng gói `AuthModule` cung cấp `RateLimitGuard`
Tạo file `backend/src/auth/auth.module.ts` để các module khác (như `ChatbotModule`) có thể tái sử dụng `RateLimitGuard`:

```typescript
// backend/src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard.js';

@Module({
  providers: [RateLimitGuard],
  exports: [RateLimitGuard],
})
export class AuthModule {}
```

> **Lưu ý:** Kiểm tra file `backend/src/auth/rate-limit.decorator.ts`:
> ```typescript
> import { SetMetadata } from "@nestjs/common";
> export const RATE_LIMIT_KEY = "rate-limit";
> export type RateLimitOptions = { limit: number; windowMs: number };
> export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
> ```

---

### Task 3.3: Refactor `ChatbotService` tích hợp RAG (`backend/src/chatbot/chatbot.service.ts`)
Inject `PoiRepository`. Khi du khách gửi câu hỏi:
1. Tìm các POI phù hợp nhất trong cơ sở dữ liệu.
2. Lấy nội dung thuyết minh đã được duyệt của POI đó để trả lời có căn cứ.
3. Kèm danh sách nguồn trích dẫn (`references`).
4. Nếu câu hỏi chung chung hoặc không tìm thấy địa điểm nào, tự động trả về thông báo fallback lịch sự.

```typescript
// backend/src/chatbot/chatbot.service.ts

import { Injectable, Optional } from '@nestjs/common';
import { PoiRepository } from '../poi/poi.repository.js';
import { ChatDto } from './dto.js';

@Injectable()
export class ChatbotService {
  constructor(
    @Optional() private readonly poiRepository?: PoiRepository,
  ) {}

  async reply(dto: ChatDto) {
    const cleanMsg = (dto.message || '').trim();

    // 1. Tra cứu ngữ cảnh từ các điểm di tích đã PUBLISHED
    if (this.poiRepository && cleanMsg) {
      try {
        const matchedPois = await this.poiRepository.findPublishedForKnowledge(cleanMsg);

        if (matchedPois && matchedPois.length > 0) {
          const topPoi = matchedPois[0];
          const narration = topPoi.narrations?.[0];
          const content = narration?.content || topPoi.description;

          return {
            answer: `Dựa trên dữ liệu di tích [${topPoi.name}]: ${content}`,
            poi: {
              id: topPoi.id,
              name: topPoi.name,
              category: topPoi.category,
              address: topPoi.address,
            },
            references: matchedPois.map((p) => ({
              id: p.id,
              name: p.name,
              address: p.address,
            })),
            provider: 'knowledge-grounded',
            disclaimer: 'Thông tin được tổng hợp từ kho tri thức di tích đã được kiểm duyệt.',
          };
        }
      } catch {
        // Fallback an toàn nếu có lỗi query
      }
    }

    // 2. Fallback mặc định
    return {
      answer: `Tôi đã nhận câu hỏi: ${cleanMsg}. Hệ thống hiện hỗ trợ hướng dẫn thông tin các điểm di tích lịch sử và văn hóa TP. Hồ Chí Minh.`,
      provider: 'local-fallback',
      disclaimer: 'Chức năng tư vấn tự động đang ở chế độ cơ bản.',
    };
  }
}
```

---

### Task 3.4: Gắn Rate Limit vào `ChatbotController` & Cập nhật `ChatbotModule`

#### Cập nhật `backend/src/chatbot/chatbot.controller.ts`:
Gắn `@UseGuards(RateLimitGuard)` và giới hạn 20 request / 60 giây (1 phút):

```typescript
// backend/src/chatbot/chatbot.controller.ts

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RateLimit } from '../auth/rate-limit.decorator.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { ChatbotService } from './chatbot.service.js';
import { ChatDto } from './dto.js';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Post('messages')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000 })
  message(@Body() dto: ChatDto) {
    return this.chatbot.reply(dto);
  }
}
```

#### Cập nhật `backend/src/chatbot/chatbot.module.ts`:
Import cả `AuthModule` và `PoiModule`:

```typescript
// backend/src/chatbot/chatbot.module.ts

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PoiModule } from '../poi/poi.module.js';
import { ChatbotController } from './chatbot.controller.js';
import { ChatbotService } from './chatbot.service.js';

@Module({
  imports: [AuthModule, PoiModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
```

---

### Task 3.5: Cập nhật Unit Test (`backend/test/chatbot.service.spec.ts`)
Kiểm tra cả 2 trường hợp: fallback và trích dẫn tri thức:

```typescript
// backend/test/chatbot.service.spec.ts

import { describe, expect, it, vi } from 'vitest';
import { ChatbotService } from '../src/chatbot/chatbot.service.js';
import type { PoiRepository } from '../src/poi/poi.repository.js';

describe('ChatbotService (RAG & Knowledge Grounding)', () => {
  it('trả về fallback hợp lệ khi không truyền repository hoặc không tìm thấy kết quả', async () => {
    const response = await new ChatbotService().reply({ message: 'Giờ mở cửa?' });
    expect(response.provider).toBe('local-fallback');
    expect(response.answer).toBeDefined();
  });

  it('trả về câu trả lời có trích dẫn (references) khi tìm thấy POI phù hợp', async () => {
    const mockRepo = {
      findPublishedForKnowledge: vi.fn().mockResolvedValue([
        {
          id: 'dinh-doc-lap',
          name: 'Dinh Độc Lập',
          category: 'culture',
          address: '135 Nam Kỳ Khởi Nghĩa',
          description: 'Di tích lịch sử Dinh Độc Lập',
          narrations: [
            {
              id: 'n-1',
              language: 'vi',
              title: 'Dinh Độc Lập',
              content: 'Chào mừng quý khách đến với Dinh Độc Lập...',
            },
          ],
        },
      ]),
    } as unknown as PoiRepository;

    const service = new ChatbotService(mockRepo);
    const response = await service.reply({ message: 'Cho tôi biết thông tin về Dinh Độc Lập' });

    expect(response.provider).toBe('knowledge-grounded');
    expect(response.answer).toContain('Dinh Độc Lập');
    expect(response.references).toBeDefined();
    expect(response.references?.length).toBe(1);
    expect(response.references?.[0].id).toBe('dinh-doc-lap');
  });
});
```

---

## 3. Định nghĩa hoàn thành (Definition of Done)
1. `npm --prefix backend run test` chạy pass toàn bộ `test/chatbot.service.spec.ts`.
2. Kiểm tra cURL với câu hỏi có tên địa điểm:
   ```bash
   curl -X POST http://localhost:3000/api/chatbot/messages \
     -H "Content-Type: application/json" \
     -d '{"message": "Dinh Độc Lập"}'
   ```
   Kết quả trả về JSON có `"provider": "knowledge-grounded"` và mảng `references` chứa ID của Dinh Độc Lập.
3. Kiểm tra cơ chế Rate Limit:
   Chạy vòng lặp gửi liên tục 25 request trong vòng 5 giây:
   - Từ request 1 đến 20: Trả về HTTP 201 thành công.
   - Từ request 21 trở đi: Trả về **HTTP 429 Too Many Requests** (`{"statusCode":429,"message":"Too many requests"}`).

