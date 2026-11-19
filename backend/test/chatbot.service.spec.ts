import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotService, cleanApiKey } from '../src/chatbot/chatbot.service.js';
import type { PoiRepository } from '../src/poi/poi.repository.js';

describe('ChatbotService', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns a clearly identified fallback reply when no repo or match', async () => {
    delete process.env.GEMINI_API_KEY;
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
    const findPublishedForKnowledge = vi.fn().mockResolvedValue([
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
    ]);
    const mockRepo = { findPublishedForKnowledge } as unknown as PoiRepository;

    const service = new ChatbotService(mockRepo);
    const response = await service.reply({
      message: 'Chùa Linh Ứng ở đâu?',
    });

    expect(findPublishedForKnowledge).toHaveBeenCalledWith(
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

  it('falls back to all published POIs when accent-free query matches via normalizeText', async () => {
    const findPublishedForKnowledge = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
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
              content: 'Dinh Độc Lập nằm tại trung tâm TP. Hồ Chí Minh.',
            },
          ],
        },
      ]);
    const mockRepo = { findPublishedForKnowledge } as unknown as PoiRepository;

    const service = new ChatbotService(mockRepo);
    const response = await service.reply({
      message: 'dinh doc lap o dau',
    });

    expect(findPublishedForKnowledge).toHaveBeenCalledTimes(2);
    expect(findPublishedForKnowledge).toHaveBeenNthCalledWith(
      1,
      'dinh doc lap',
    );
    expect(findPublishedForKnowledge).toHaveBeenNthCalledWith(2);
    expect(response.provider).toBe('knowledge-grounded');
    expect(response.poi?.name).toBe('Dinh Độc Lập');
    expect(response.answer).toContain('Dinh Độc Lập');
  });

  it('returns gemini-rag response when GEMINI_API_KEY is configured and Gemini API succeeds', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Dinh Độc Lập là di tích lịch sử quan trọng tại trung tâm TP.HCM.',
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

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
              content: 'Chào mừng quý khách đến với Dinh Độc Lập.',
            },
          ],
        },
      ]),
    } as unknown as PoiRepository;

    const service = new ChatbotService(mockRepo);
    const response = await service.reply({
      message: 'Kể cho tôi về Dinh Độc Lập',
      language: 'vi',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.provider).toBe('gemini-rag');
    expect(response.answer).toContain('Dinh Độc Lập là di tích lịch sử');
    expect(response.references).toHaveLength(1);
  });

  it('falls back to knowledge-grounded when GEMINI_API_KEY is set but fetch fails for all candidate models', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network timeout'));
    vi.stubGlobal('fetch', fetchMock);

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
              content: 'Nội dung gốc từ cơ sở dữ liệu.',
            },
          ],
        },
      ]),
    } as unknown as PoiRepository;

    const service = new ChatbotService(mockRepo);
    const response = await service.reply({
      message: 'Thông tin Dinh Độc Lập',
    });

    // 4 candidate models are attempted before fallback
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(response.provider).toBe('knowledge-grounded');
    expect(response.answer).toContain('Nội dung gốc từ cơ sở dữ liệu.');
  });

  it('tries next candidate model if first model returns HTTP error', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Gợi ý từ model gemini-3.1-flash-lite thành công.',
                  },
                ],
              },
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const mockRepo = {
      findPublishedForKnowledge: vi.fn().mockResolvedValue([]),
    } as unknown as PoiRepository;

    const service = new ChatbotService(mockRepo);
    const response = await service.reply({
      message: 'Gợi ý lịch trình 2 tiếng ở Quận 1',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.provider).toBe('gemini-rag');
    expect(response.answer).toContain(
      'Gợi ý từ model gemini-3.1-flash-lite thành công.',
    );
  });

  it('cleans quotes and whitespace from API key correctly', () => {
    expect(cleanApiKey('"my-key"')).toBe('my-key');
    expect(cleanApiKey("'my-key' ")).toBe('my-key');
    expect(cleanApiKey('  ')).toBeUndefined();
    expect(cleanApiKey(undefined)).toBeUndefined();
  });
});


