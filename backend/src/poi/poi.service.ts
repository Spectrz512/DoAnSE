/**
 * ==============================================================================
 * MODULE: POI (POINT OF INTEREST) & CLOUD TTS PROXY
 * TẦNG: BUSINESS LOGIC LAYER (XỬ LÝ NGHIỆP VỤ CỐT LÕI)
 * ==============================================================================
 * Vai trò & Thuật toán:
 * 1. findNearbyWithTriggerState:
 *    - Áp dụng cơ chế Hysteresis: Kích hoạt tại bán kính triggerRadiusM (80m),
 *      chỉ cho phép phát lại khi du khách đi xa ra ngoài resetRadiusM (120m = 1.5x).
 *    - Quản lý tập hợp playedPoiIds để ngăn chặn phát trùng lặp liên tục.
 * 2. generateTtsAudio:
 *    - Bộ chuyển đổi văn bản thành giọng nói (TTS) nhẹ trên Backend.
 *    - Tự động chuẩn hóa mã ngôn ngữ sang Google Translate TTS (20 thứ tiếng).
 *    - Tách đoạn văn bản thông minh (<= 175 ký tự theo dấu câu) và ghép luồng MP3.
 * ==============================================================================
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Language } from '@prisma/client';
import { CreatePoiDto, NearbyPoiQueryDto } from './dto.js';
import { PoiRepository } from './poi.repository.js';

@Injectable()
export class PoiService {
  constructor(private readonly pois: PoiRepository) {}

  bootstrap() { return this.pois.bootstrap(); }

  list(query?: string, category?: string) { return this.pois.list(query, category); }

  async findOne(id: string) {
    const poi = await this.pois.find(id);
    if (!poi) throw new NotFoundException('POI not found');
    return poi;
  }

  create(dto: CreatePoiDto) { return this.pois.create(dto); }

  async findNearbyWithTriggerState(query: NearbyPoiQueryDto) {
    const lat = query.lat;
    const lng = query.lng;
    const radiusM = query.radiusM ?? 500;
    const language = query.language ?? Language.vi;

    const playedSet = new Set(
      (query.playedPoiIds ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );

    // Mở rộng vùng tìm kiếm (tối thiểu 5000m) để kiểm tra các POI đã phát nhưng người dùng vừa rời bán kính
    const checkRange = Math.max(radiusM, 5000);
    const allPoisInCheckRange = await this.pois.findNearby(lat, lng, checkRange, language);

    // POI đã phát và người dùng đã đi xa >= 1.5 * triggerRadiusM → đưa vào resetPoiIds, xóa khỏi playedSet
    const resetPoiIds: string[] = [];
    for (const poi of allPoisInCheckRange) {
      if (playedSet.has(poi.id) && poi.distanceM >= poi.resetRadiusM) {
        resetPoiIds.push(poi.id);
        playedSet.delete(poi.id);
      }
    }

    const nearbyItems = allPoisInCheckRange
      .filter((poi) => poi.distanceM <= radiusM)
      .map((poi) => {
        const isPlayed = playedSet.has(poi.id);
        const withinTrigger = poi.distanceM <= poi.triggerRadiusM;
        return {
          ...poi,
          isPlayed,
          withinTrigger,
          shouldTrigger: withinTrigger && !isPlayed,
        };
      });

    const nextTriggerPoi = nearbyItems.find((item) => item.shouldTrigger) ?? null;

    return {
      userLocation: { lat, lng },
      radiusM,
      language,
      resetPoiIds,
      activePlayedPoiIds: [...playedSet],
      nextTriggerPoi,
      items: nearbyItems,
    };
  }

  /**
   * Tạo luồng âm thanh TTS từ Google Translate (hỗ trợ cả 20 ngôn ngữ)
   */
  async generateTtsAudio(text: string, lang = 'vi'): Promise<Buffer> {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return Buffer.alloc(0);

    const GOOGLE_TTS_LANG_MAP: Record<string, string> = {
      vi: 'vi',
      en: 'en',
      zh: 'zh-CN',
      zh_TW: 'zh-TW',
      ja: 'ja',
      ko: 'ko',
      th: 'th',
      lo: 'lo',
      km: 'km',
      id: 'id',
      ms: 'ms',
      fil: 'tl',
      hi: 'hi',
      ar: 'ar',
      ru: 'ru',
      pt: 'pt',
      it: 'it',
      fr: 'fr',
      de: 'de',
      es: 'es',
    };
    const ttsLang = GOOGLE_TTS_LANG_MAP[lang.toLowerCase()] || lang || 'vi';

    // Chia văn bản thành các đoạn ngắn <= 175 ký tự theo câu để Google TTS không bị lỗi
    const chunks = this.splitTextForTts(cleanText, 175);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(ttsLang)}&q=${encodeURIComponent(chunk)}`;
      try {
        const resp = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://translate.google.com/',
          },
          signal: AbortSignal.timeout(6000),
        });
        if (resp.ok) {
          const ab = await resp.arrayBuffer();
          audioBuffers.push(Buffer.from(ab));
        }
      } catch {
        // Fallback: nếu gọi 1 chunk bị timeout/lỗi mạng thì tiếp tục các chunk còn lại
      }
    }

    return Buffer.concat(audioBuffers);
  }

  private splitTextForTts(rawText: string, maxLen = 175): string[] {
    if (rawText.length <= maxLen) return [rawText];

    const sentenceRegex = /[^.!?。！？\n]+[.!?。！？\n]*/g;
    const rawSentences = rawText.match(sentenceRegex) || [rawText];

    const chunks: string[] = [];
    let currentChunk = '';

    for (const sent of rawSentences) {
      const trimmed = sent.trim();
      if (!trimmed) continue;

      if (trimmed.length > maxLen) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        const words = trimmed.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).trim().length <= maxLen) {
            sub = (sub + ' ' + w).trim();
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        if (sub) chunks.push(sub);
      } else {
        if ((currentChunk + ' ' + trimmed).trim().length <= maxLen) {
          currentChunk = (currentChunk + ' ' + trimmed).trim();
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = trimmed;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.slice(0, 15);
  }
}
