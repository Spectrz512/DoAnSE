import { describe, expect, it, vi } from 'vitest';
import { Language } from '@prisma/client';
import { TranslationService } from '../src/translation/translation.service.js';
import type { TranslationRepository } from '../src/translation/translation.repository.js';

describe('TranslationService (3-Tier Architecture with TranslationRepository)', () => {
  const mockLanguages = [
    { code: 'vi', nameVi: 'Tiếng Việt', nameEn: 'Vietnamese', nativeName: 'Tiếng Việt', flagEmoji: '🇻🇳', isAvailable: true, sortOrder: 1 },
    { code: 'en', nameVi: 'Tiếng Anh', nameEn: 'English', nativeName: 'English', flagEmoji: '🇬🇧', isAvailable: true, sortOrder: 2 },
  ];

  const mockNarration = {
    id: 'nar-1',
    poiId: 'poi-dinh-doc-lap',
    language: Language.vi,
    title: 'Dinh Độc Lập',
    content: 'Nội dung thuyết minh Dinh Độc Lập...',
    audioUrl: 'https://cdn.example.com/audio/vi/dinh-doc-lap.mp3',
    durationSeconds: 180,
  };

  it('lấy danh sách ngôn ngữ từ repository khi có dữ liệu catalog', async () => {
    const findLanguagesSpy = vi.fn().mockResolvedValue(mockLanguages);
    const mockRepo = {
      findLanguages: findLanguagesSpy,
      findNarration: vi.fn(),
    } as unknown as TranslationRepository;

    const service = new TranslationService(mockRepo);
    const result = await service.languages();

    expect(result).toHaveLength(2);
    expect(result[0].code).toBe('vi');
    expect(findLanguagesSpy).toHaveBeenCalledTimes(1);
  });

  it('fallback về danh sách 20 ngôn ngữ mặc định nếu repository trả về rỗng', async () => {
    const mockRepo = {
      findLanguages: vi.fn().mockResolvedValue([]),
      findNarration: vi.fn(),
    } as unknown as TranslationRepository;

    const service = new TranslationService(mockRepo);
    const result = await service.languages();

    expect(result).toHaveLength(20);
    expect(result[0].code).toBe('vi');
  });

  it('lấy bản dịch thuyết minh thành công khi tồn tại trong repository', async () => {
    const findNarrationSpy = vi.fn().mockResolvedValue(mockNarration);
    const mockRepo = {
      findLanguages: vi.fn(),
      findNarration: findNarrationSpy,
    } as unknown as TranslationRepository;

    const service = new TranslationService(mockRepo);
    const result = await service.narration('poi-dinh-doc-lap', Language.vi);

    expect(result.id).toBe('nar-1');
    expect(result.title).toBe('Dinh Độc Lập');
    expect(result.durationSeconds).toBe(180);
    expect(findNarrationSpy).toHaveBeenCalledWith('poi-dinh-doc-lap', Language.vi);
  });

  it('ném lỗi NotFoundException khi bản dịch ngôn ngữ chưa khả dụng', async () => {
    const mockRepo = {
      findLanguages: vi.fn(),
      findNarration: vi.fn().mockResolvedValue(null),
    } as unknown as TranslationRepository;

    const service = new TranslationService(mockRepo);
    await expect(service.narration('poi-dinh-doc-lap', Language.ko)).rejects.toThrowError(
      'chưa khả dụng hoặc đang được biên tập',
    );
  });
});
