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

  it('preserves Vietnamese accents when searching the knowledge base', async () => {
    const mockRepo = {
      findPublishedForKnowledge: vi.fn().mockResolvedValue([
        {
          id: 'chua-linh-ung',
          name: 'Chùa Linh Ứng',
          category: 'temple',
          address: 'Bãi Bụt, Đà Nẵng',
          description: 'Ngôi chùa nổi tiếng tại Đà Nẵng',
          narrations: [
            {
              id: 'n-2',
              language: 'vi',
              title: 'Chùa Linh Ứng',
              content: 'Chùa Linh Ứng tọa lạc tại Bãi Bụt.',
            },
          ],
        },
      ]),
    } as unknown as PoiRepository;

    const service = new ChatbotService(mockRepo);
    const response = await service.reply({
      message: 'Chùa Linh Ứng ở đâu?',
    });

    expect(mockRepo.findPublishedForKnowledge).toHaveBeenCalledWith(
      'chùa linh ứng',
    );
    expect(response.provider).toBe('knowledge-grounded');
    expect(response.answer).toContain('Chùa Linh Ứng');
  });

  it('selects narration matching the requested language', async () => {
    const mockRepo = {
      findPublishedForKnowledge: vi.fn().mockResolvedValue([
        {
          id: 'dinh-doc-lap',
          name: 'Dinh Độc Lập',
          category: 'culture',
          address: 'TP. Hồ Chí Minh',
          description: 'Di tích lịch sử',
          narrations: [
            {
              id: 'n-vi',
              language: 'vi',
              title: 'Dinh Độc Lập',
              content: 'Nội dung tiếng Việt',
            },
            {
              id: 'n-en',
              language: 'en',
              title: 'Independence Palace',
              content: 'English narration',
            },
          ],
        },
      ]),
    } as unknown as PoiRepository;

    const service = new ChatbotService(mockRepo);
    const response = await service.reply({
      message: 'Thông tin Dinh Độc Lập',
      language: 'en',
    });

    expect(response.answer).toContain('English narration');
    expect(response.language).toBe('en');
  });
});
