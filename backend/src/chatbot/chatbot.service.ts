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

    // 1. Nếu có PoiRepository, tra cứu ngữ cảnh từ các điểm di tích đã PUBLISHED
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
        // Fallback khi DB truy vấn thất bại
      }
    }

    // 2. Chế độ fallback định sẵn
    return {
      answer: `Tôi đã nhận câu hỏi: ${cleanMsg}. Hệ thống hiện hỗ trợ hướng dẫn thông tin các điểm di tích lịch sử và văn hóa TP. Hồ Chí Minh.`,
      provider: 'local-fallback',
      disclaimer: 'Chức năng tư vấn tự động đang ở chế độ cơ bản.',
    };
  }
}
