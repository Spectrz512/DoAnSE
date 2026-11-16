import { Injectable, Optional } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PoiRepository } from '../poi/poi.repository.js';
import { ChatDto } from './dto.js';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const STOP_WORDS = new Set([
  'la', 'va', 'cua', 'co', 'cho', 'toi', 'biet',
  've', 'nhu', 'the', 'nao', 'gi', 'nhung',
  'cac', 'mot', 'tai', 'o', 'den', 'voi',
  'hay', 'xin', 'vui', 'long', 'cho', 'hoi',
  'duoc', 'khong', 'bao', 'nhieu', 'dau',
]);

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function extractSearchTerms(value: string): string[] {
  return [
    ...new Set(
      (value.toLocaleLowerCase('vi').match(/[\p{L}\p{N}]+/gu) || [])
        .filter((term) => {
          const normalized = normalizeText(term);
          return normalized.length >= 2 && !STOP_WORDS.has(normalized);
        }),
    ),
  ].slice(0, 8);
}


@Injectable()
export class ChatbotService {
  constructor(
    @Optional() private readonly poiRepository?: PoiRepository,
  ) {}

  async reply(dto: ChatDto) {
    const cleanMsg = (dto.message || '').trim();
    const language = dto.language ?? Language.vi;
    const searchTerms = extractSearchTerms(cleanMsg);
    const keywords = searchTerms.map(normalizeText);

    if (this.poiRepository && keywords.length > 0) {
      try {
        let candidates =
          await this.poiRepository.findPublishedForKnowledge(
            searchTerms.join(' '),
          );

        if (!candidates || candidates.length === 0) {
          candidates = await this.poiRepository.findPublishedForKnowledge();
        }

        const rankedPois = (candidates || [])
          .map((poi) => {
            const name = normalizeText(poi.name);
            const description = normalizeText(poi.description);
            const address = normalizeText(poi.address || '');

            const score = keywords.reduce((total, keyword) => {
              if (name.includes(keyword)) return total + 5;
              if (description.includes(keyword)) return total + 2;
              if (address.includes(keyword)) return total + 1;
              return total;
            }, 0);

            return { poi, score };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score);

        if (rankedPois.length > 0) {
          const topPoi = rankedPois[0].poi;

          const narration =
            topPoi.narrations?.find(
              (item) => item.language === language,
            ) ??
            topPoi.narrations?.find(
              (item) => item.language === Language.vi,
            );

          const content =
            narration?.content || topPoi.description;

          const poiPayload = {
            id: topPoi.id,
            name: topPoi.name,
            category: topPoi.category,
            address: topPoi.address,
          };
          const references = rankedPois.slice(0, 3).map(({ poi }) => ({
            id: poi.id,
            name: poi.name,
            address: poi.address,
          }));

          const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
          if (geminiApiKey) {
            const contextText = rankedPois
              .slice(0, 3)
              .map(({ poi }) => {
                const poiNarration =
                  poi.narrations?.find((item) => item.language === language) ??
                  poi.narrations?.find((item) => item.language === Language.vi);
                const narrationText = poiNarration?.content || poi.description;
                return `- Tên: ${poi.name}\n  Địa chỉ: ${poi.address || 'Không rõ'}\n  Mô tả: ${poi.description}\n  Thuyết minh: ${narrationText}`;
              })
              .join('\n\n');

            const geminiAnswer = await this.generateWithGemini(
              geminiApiKey,
              cleanMsg,
              language,
              contextText,
            );

            if (geminiAnswer) {
              return {
                answer: geminiAnswer,
                poi: poiPayload,
                references,
                provider: 'gemini-rag',
                language: narration?.language ?? language,
                disclaimer:
                  'Thông tin được tổng hợp bởi AI từ kho tri thức di tích đã được kiểm duyệt.',
              };
            }
          }

          return {
            answer: `Dựa trên dữ liệu di tích [${topPoi.name}]: ${content}`,
            poi: poiPayload,
            references,
            provider: 'knowledge-grounded',
            language: narration?.language ?? Language.vi,
            disclaimer:
              'Thông tin được tổng hợp từ kho tri thức di tích đã được kiểm duyệt.',
          };
        }
      } catch {
        // Giữ fallback để chatbot không làm gián đoạn API.
      }
    }

    return {
      answer: cleanMsg
        ? `Tôi chưa tìm thấy thông tin phù hợp với câu hỏi: ${cleanMsg}. Bạn có thể thử hỏi bằng tên địa điểm hoặc công trình cụ thể.`
        : 'Vui lòng nhập câu hỏi để tôi hỗ trợ.',
      provider: 'local-fallback',
      disclaimer:
        'Câu trả lời chưa được xác thực từ kho tri thức di tích.',
    };
  }

  private async generateWithGemini(
    apiKey: string,
    question: string,
    language: Language,
    contextText: string,
  ): Promise<string | null> {
    const prompt = [
      'Bạn là hướng dẫn viên du lịch ảo thông minh của hệ thống Hồ Chí Minh GPS Audio Guide.',
      `Hãy trả lời ngắn gọn, tự nhiên, lịch sự và chính xác bằng ngôn ngữ "${language}" chỉ dựa trên ngữ cảnh di tích được kiểm duyệt dưới đây.`,
      'Không bịa thêm thông tin ngoài ngữ cảnh nếu ngữ cảnh không đề cập.',
      '',
      'Ngữ cảnh di tích:',
      contextText,
      '',
      `Câu hỏi của du khách: ${question}`,
    ].join('\n');

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as GeminiGenerateContentResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return text || null;
    } catch {
      return null;
    }
  }
}
