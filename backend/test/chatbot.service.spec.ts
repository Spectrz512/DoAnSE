import { describe, expect, it, vi } from 'vitest';
import { ChatbotService } from '../src/chatbot/chatbot.service.js';
import type { PoiRepository } from '../src/poi/poi.repository.js';

describe('ChatbotService', () => {
  it('returns a clearly identified fallback reply when no repo or match', async () => {
    const response = await new ChatbotService().reply({ message: 'Giờ mở cửa?' });
    expect(response.provider).toBe('local-fallback');
    expect(response.answer).toBeDefined();
  });

  it('returns grounded knowledge response when matched published POI found', async () => {
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
  });
});
