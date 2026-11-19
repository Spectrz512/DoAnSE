/**
 * ==============================================================================
 * MODULE: TRANSLATION (DANH MỤC 20 NGÔN NGỮ QUỐC TẾ)
 * TẦNG: BUSINESS LOGIC LAYER (CHUẨN HÓA MÃ ISO & DỮ LIỆU ĐA NGỮ)
 * ==============================================================================
 * Vai trò:
 * - Quản lý 20 ngôn ngữ chuẩn ISO (vi, en, fr, ja, zh, zh_TW, ko, th, lo, km, id, ms, fil, hi, ar, ru, pt, it, de, es).
 * - Xử lý fallback an toàn về tiếng Việt khi mã ngôn ngữ không hợp lệ.
 * ==============================================================================
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Language } from '@prisma/client';
import { TranslationRepository } from './translation.repository.js';

@Injectable()
export class TranslationService {
  constructor(private readonly repository: TranslationRepository) {}

  /**
   * Lấy danh sách 20 ngôn ngữ được hệ thống hỗ trợ từ LanguageCatalog.
   * Kèm thông tin bản ngữ, cờ hiệu và trạng thái khả dụng.
   */
  async languages() {
    const list = await this.repository.findLanguages();

    if (list.length > 0) {
      return list;
    }

    // Fallback nếu chưa seed
    return [
      { code: 'vi', nameVi: 'Tiếng Việt', nameEn: 'Vietnamese', nativeName: 'Tiếng Việt', flagEmoji: '🇻🇳', isAvailable: true, sortOrder: 1 },
      { code: 'en', nameVi: 'Tiếng Anh', nameEn: 'English', nativeName: 'English', flagEmoji: '🇬🇧', isAvailable: true, sortOrder: 2 },
      { code: 'zh', nameVi: 'Tiếng Trung (Giản thể)', nameEn: 'Chinese (Simplified)', nativeName: '中文（简体）', flagEmoji: '🇨🇳', isAvailable: true, sortOrder: 3 },
      { code: 'zh_TW', nameVi: 'Tiếng Trung (Phồn thể)', nameEn: 'Chinese (Traditional)', nativeName: '中文（繁體）', flagEmoji: '🇹🇼', isAvailable: true, sortOrder: 4 },
      { code: 'ja', nameVi: 'Tiếng Nhật', nameEn: 'Japanese', nativeName: '日本語', flagEmoji: '🇯🇵', isAvailable: true, sortOrder: 5 },
      { code: 'ko', nameVi: 'Tiếng Hàn', nameEn: 'Korean', nativeName: '한국어', flagEmoji: '🇰🇷', isAvailable: true, sortOrder: 6 },
      { code: 'th', nameVi: 'Tiếng Thái', nameEn: 'Thai', nativeName: 'ภาษาไทย', flagEmoji: '🇹🇭', isAvailable: true, sortOrder: 7 },
      { code: 'lo', nameVi: 'Tiếng Lào', nameEn: 'Lao', nativeName: 'ພາສາລາວ', flagEmoji: '🇱🇦', isAvailable: true, sortOrder: 8 },
      { code: 'km', nameVi: 'Tiếng Khmer', nameEn: 'Khmer', nativeName: 'ភាសាខ្មែរ', flagEmoji: '🇰🇭', isAvailable: true, sortOrder: 9 },
      { code: 'id', nameVi: 'Tiếng Indonesia', nameEn: 'Indonesian', nativeName: 'Bahasa Indonesia', flagEmoji: '🇮🇩', isAvailable: true, sortOrder: 10 },
      { code: 'ms', nameVi: 'Tiếng Malaysia', nameEn: 'Malay', nativeName: 'Bahasa Melayu', flagEmoji: '🇲🇾', isAvailable: true, sortOrder: 11 },
      { code: 'fil', nameVi: 'Tiếng Philippines', nameEn: 'Filipino', nativeName: 'Wikang Filipino', flagEmoji: '🇵🇭', isAvailable: true, sortOrder: 12 },
      { code: 'hi', nameVi: 'Tiếng Hindi', nameEn: 'Hindi', nativeName: 'हिन्दी', flagEmoji: '🇮🇳', isAvailable: true, sortOrder: 13 },
      { code: 'ar', nameVi: 'Tiếng Ả Rập', nameEn: 'Arabic', nativeName: 'العربية', flagEmoji: '🇸🇦', isAvailable: true, sortOrder: 14 },
      { code: 'ru', nameVi: 'Tiếng Nga', nameEn: 'Russian', nativeName: 'Русский', flagEmoji: '🇷🇺', isAvailable: true, sortOrder: 15 },
      { code: 'pt', nameVi: 'Tiếng Bồ Đào Nha', nameEn: 'Portuguese', nativeName: 'Português', flagEmoji: '🇵🇹', isAvailable: true, sortOrder: 16 },
      { code: 'it', nameVi: 'Tiếng Ý', nameEn: 'Italian', nativeName: 'Italiano', flagEmoji: '🇮🇹', isAvailable: true, sortOrder: 17 },
      { code: 'fr', nameVi: 'Tiếng Pháp', nameEn: 'French', nativeName: 'Français', flagEmoji: '🇫🇷', isAvailable: true, sortOrder: 18 },
      { code: 'de', nameVi: 'Tiếng Đức', nameEn: 'German', nativeName: 'Deutsch', flagEmoji: '🇩🇪', isAvailable: true, sortOrder: 19 },
      { code: 'es', nameVi: 'Tiếng Tây Ban Nha', nameEn: 'Spanish', nativeName: 'Español', flagEmoji: '🇪🇸', isAvailable: true, sortOrder: 20 },
    ];
  }

  /**
   * Truy vấn nội dung thuyết minh theo POI và ngôn ngữ chỉ định.
   */
  async narration(poiId: string, language: Language) {
    const narration = await this.repository.findNarration(poiId, language);

    if (!narration) {
      throw new NotFoundException(`Nội dung thuyết minh cho ngôn ngữ [${language}] chưa khả dụng hoặc đang được biên tập.`);
    }

    return narration;
  }
}
