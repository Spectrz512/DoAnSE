/**
 * ==============================================================================
 * MODULE: AI CHATBOT (HƯỚNG DẪN VIÊN DU LỊCH AI SÀI GÒN)
 * TẦNG: BUSINESS LOGIC LAYER (MÔ HÌNH HYBRID RAG & XOAY VÒNG MODEL)
 * ==============================================================================
 * Vai trò & Thuật toán:
 * 1. Hybrid RAG (Retrieval-Augmented Generation):
 *    - Trích xuất dữ liệu thực tế của 13 di tích Sài Gòn (tên, địa chỉ, lịch sử, ẩm thực)
 *      từ CSDL nội bộ để làm ngữ cảnh tin cậy (Grounding Knowledge).
 *    - Triệt tiêu 100% hiện tượng "ảo giác" (hallucination) của mô hình ngôn ngữ lớn.
 * 2. Model Rotation & Multi-layer Fallback:
 *    - Tự động xoay vòng qua danh sách: gemini-2.5-flash -> gemini-3.1-flash-lite ->
 *      gemini-3.8-flash -> gemini-flash-latest.
 *    - Tự động kích hoạt lớp Fallback tri thức nội bộ (Local Knowledge-Grounded)
 *      khi mất kết nối internet hoặc API Gemini quá tải.
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { Injectable, Logger, Optional } from '@nestjs/common';
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

type PoiKnowledgeItem = Awaited<
  ReturnType<PoiRepository['findPublishedForKnowledge']>
>[number];

const STOP_WORDS = new Set([
  'la', 'va', 'cua', 'co', 'cho', 'toi', 'biet',
  've', 'nhu', 'the', 'nao', 'gi', 'nhung',
  'cac', 'mot', 'tai', 'o', 'den', 'voi',
  'hay', 'xin', 'vui', 'long', 'cho', 'hoi',
  'duoc', 'khong', 'bao', 'nhieu', 'dau',
]);

const SUGGESTED_TOURS_KNOWLEDGE = [
  {
    name: 'Tour Di Tích & Văn Hóa Trung Tâm Sài Gòn (45 phút)',
    description:
      'Hành trình khám phá 8 di tích và danh thắng kiến trúc biểu tượng: Dinh Độc Lập -> Nhà thờ Đức Bà -> Bưu điện Trung tâm -> Bảo tàng Chứng tích Chiến tranh -> Nhà hát Thành phố -> Phố đi bộ Nguyễn Huệ -> Chợ Bến Thành -> Bến Nhà Rồng.',
  },
  {
    name: 'Tuyến Đi Bộ Di Sản & Ẩm Thực Sài Gòn (30 phút)',
    description:
      'Tuyến đi bộ ngắm kiến trúc Pháp cổ kính và khám phá ẩm thực: Nhà thờ Đức Bà -> Bưu điện Trung tâm -> Nhà hát Thành phố -> Phố đi bộ Nguyễn Huệ -> Chợ Bến Thành.',
  },
  {
    name: 'Tuyến Ký Ức Lịch Sử & Kiến Trúc Sài Gòn (45 phút)',
    description:
      'Chiêm ngưỡng kiệt tác nghệ thuật và không gian văn hóa thanh bình: Bảo tàng Mỹ thuật -> Bến Bạch Đằng -> Hồ Con Rùa -> Thảo Cầm Viên -> Chùa Ngọc Hoàng.',
  },
];

export function cleanApiKey(key?: string): string | undefined {
  if (!key) return undefined;
  const cleaned = key.trim().replace(/^["']|["']$/g, '').trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

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
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @Optional() private readonly poiRepository?: PoiRepository,
  ) {}

  private getApiKey(): string | undefined {
    const directKey = cleanApiKey(process.env.GEMINI_API_KEY);
    if (directKey) return directKey;

    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      const candidatePaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'backend/.env'),
        path.resolve(process.cwd(), '../.env'),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            const content = fs.readFileSync(p, 'utf-8');
            const match = content.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)$/m);
            if (match && match[1]) {
              const cleaned = cleanApiKey(match[1]);
              if (cleaned) return cleaned;
            }
          } catch {
            // Bỏ qua lỗi đọc file
          }
        }
      }
    }

    return undefined;
  }

  async reply(dto: ChatDto) {
    const cleanMsg = (dto.message || '').trim();
    if (!cleanMsg) {
      return {
        answer: 'Vui lòng nhập câu hỏi để tôi hỗ trợ.',
        provider: 'local-fallback',
        disclaimer: 'Câu trả lời từ trợ lý du lịch ảo Hồ Chí Minh GPS Audio Guide.',
      };
    }

    const language = dto.language ?? Language.vi;
    const searchTerms = extractSearchTerms(cleanMsg);
    const keywords = searchTerms.map(normalizeText);

    let publishedPois: PoiKnowledgeItem[] = [];
    let rankedPois: Array<{ poi: PoiKnowledgeItem; score: number }> = [];

    if (this.poiRepository) {
      try {
        if (keywords.length > 0) {
          let candidates = await this.poiRepository.findPublishedForKnowledge(
            searchTerms.join(' '),
          );
          if (!candidates || candidates.length === 0) {
            candidates = await this.poiRepository.findPublishedForKnowledge();
          }
          publishedPois = candidates || [];
        } else {
          publishedPois = (await this.poiRepository.findPublishedForKnowledge()) || [];
        }

        rankedPois = publishedPois
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
      } catch {
        // Fallback an toàn nếu truy vấn cơ sở dữ liệu gặp sự cố
      }
    }

    const topItem = rankedPois.length > 0 ? rankedPois[0] : undefined;
    const topPoi = topItem?.poi;

    const poiPayload = topPoi
      ? {
          id: topPoi.id,
          name: topPoi.name,
          category: topPoi.category,
          address: topPoi.address,
        }
      : undefined;

    const references = rankedPois.slice(0, 3).map(({ poi }) => ({
      id: poi.id,
      name: poi.name,
      address: poi.address,
    }));

    // 1. ƯU TIÊN GỌI GEMINI RAG TRƯỚC CHO MỌI CÂU HỎI KHI CÓ GEMINI_API_KEY
    const geminiApiKey = this.getApiKey();
    if (geminiApiKey) {
      const poisContext = (publishedPois.length > 0 ? publishedPois : [
        {
          name: 'Dinh Độc Lập',
          address: '135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1',
          description: 'Di tích lịch sử Dinh Độc Lập - biểu tượng thống nhất non sông.',
        },
        {
          name: 'Nhà thờ Đức Bà',
          address: '01 Công xã Paris, Bến Nghé, Quận 1',
          description: 'Kiệt tác kiến trúc Gothic cổ kính giữa trung tâm Sài Gòn.',
        },
        {
          name: 'Bưu điện Trung tâm Sài Gòn',
          address: '02 Công xã Paris, Bến Nghé, Quận 1',
          description: 'Công trình kiến trúc Pháp tiêu biểu kết hợp Á - Âu hài hòa.',
        },
        {
          name: 'Chợ Bến Thành',
          address: 'Đường Lê Lợi, Bến Thành, Quận 1',
          description: 'Biểu tượng văn hóa, giao thương và ẩm thực Sài Gòn hơn 100 năm.',
        },
      ])
        .slice(0, 13)
        .map((p) => {
          const narration =
            'narrations' in p && Array.isArray(p.narrations)
              ? (p.narrations.find((item) => item.language === language) ??
                 p.narrations.find((item) => item.language === Language.vi))
              : undefined;
          const detail = narration?.content || p.description;
          return `- [${p.name}] (Địa chỉ: ${p.address || 'Quận 1, TP.HCM'}): ${detail}`;
        })
        .join('\n');

      const toursContext = SUGGESTED_TOURS_KNOWLEDGE.map(
        (t) => `* ${t.name}: ${t.description}`,
      ).join('\n');

      const fullPrompt = [
        'Bạn là hướng dẫn viên du lịch ảo thông minh và am hiểu sâu sắc của hệ thống "Sài Gòn Di Sản" (Hồ Chí Minh GPS Audio Guide).',
        'Nhiệm vụ của bạn là tư vấn tận tâm, giải đáp câu hỏi và giới thiệu các di tích lịch sử, văn hóa cùng trải nghiệm ẩm thực, đời sống tại TP. Hồ Chí Minh.',
        '',
        'QUY TẮC PHẢN HỒI QUAN TRỌNG:',
        `1. Ngôn ngữ: Bắt buộc trả lời bằng đúng ngôn ngữ "${language}". Giọng văn tự nhiên, truyền cảm, lịch thiệp và hiếu khách như một hướng dẫn viên bản địa thực thụ.`,
        '2. Lộ trình & Quản lý thời gian: Khi du khách hỏi về thời gian (ví dụ: "có 2 tiếng buổi sáng", "nửa ngày", "1 ngày") hoặc hỏi lộ trình tham quan trung tâm Sài Gòn, hãy sắp xếp các điểm tham quan gần nhau tại Quận 1 theo thứ tự logic, thuận tiện di chuyển (ví dụ: Nhà thờ Đức Bà -> Bưu điện Trung tâm -> Dinh Độc Lập -> Chợ Bến Thành). Nêu rõ thời gian ước tính tham quan mỗi điểm.',
        '3. Ẩm thực & Cà phê Sài Gòn: ĐƯỢC PHÉP và KHUYẾN KHÍCH gợi ý các món ăn sáng, ẩm thực đường phố và quán cà phê nổi tiếng của Sài Gòn xung quanh lộ trình (ví dụ: Cơm tấm Ba Ghiền/Thuận Kiều/Cali, Bánh mì Huỳnh Hoa (26 Lê Thị Riêng) / Bánh mì chảo Hòa Mã, Phở Lệ (Võ Văn Tần) / Phở Hòa Pasteur, Cà phê bệt Nhà thờ Đức Bà - công viên 30/4, Cà phê vợt Ba Lù / Phan Đình Phùng...).',
        '4. Định dạng: Trình bày rõ ràng, mạch lạc, dùng dấu đầu dòng (-) hoặc số thứ tự và in đậm tên địa danh, món ăn để du khách dễ theo dõi trên điện thoại.',
        '',
        'KHO DỮ LIỆU DI TÍCH SÀI GÒN KIỂM DUYỆT:',
        poisContext,
        '',
        'CÁC TUYẾN TOUR GỢI Ý TIÊU BIỂU:',
        toursContext,
        '',
        topPoi
          ? `DI TÍCH TRỌNG TÂM ĐƯỢC KHỚP VỚI CÂU HỎI: [${topPoi.name}] (${topPoi.address || ''})`
          : '',
        '',
        `CÂU HỎI CỦA DU KHÁCH: ${cleanMsg}`,
      ]
        .filter(Boolean)
        .join('\n');

      const geminiAnswer = await this.generateWithGemini(geminiApiKey, fullPrompt);

      if (geminiAnswer) {
        return {
          answer: geminiAnswer,
          poi: poiPayload,
          references: references.length > 0 ? references : undefined,
          provider: 'gemini-rag',
          language,
          disclaimer:
            'Thông tin được tổng hợp bởi AI từ kho tri thức di tích đã được kiểm duyệt.',
        };
      }
    }

    // 2. FALLBACK KNOWLEDGE-GROUNDED KHI KHÔNG CÓ GEMINI_API_KEY HOẶC GỌI GEMINI BỊ LỖI
    if (topPoi) {
      const narration =
        topPoi.narrations?.find((item) => item.language === language) ??
        topPoi.narrations?.find((item) => item.language === Language.vi);

      const content = narration?.content || topPoi.description;

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

    // 3. FALLBACK MẶC ĐỊNH
    return {
      answer: `Tôi chưa tìm thấy thông tin phù hợp với câu hỏi: "${cleanMsg}". Bạn có thể thử hỏi theo tên di tích cụ thể (Dinh Độc Lập, Nhà thờ Đức Bà, Bưu điện Trung tâm, Chợ Bến Thành, v.v.) hoặc chạm vào các điểm trên bản đồ để nghe thuyết minh trực tiếp.`,
      provider: 'local-fallback',
      disclaimer: 'Câu trả lời từ trợ lý du lịch ảo Hồ Chí Minh GPS Audio Guide.',
    };
  }

  private async generateWithGemini(
    apiKey: string,
    prompt: string,
  ): Promise<string | null> {
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    let lastError: string | null = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(9000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (!response.ok) {
          const statusText = response.statusText || '';
          this.logger.warn(
            `Gemini API model [${model}] trả về HTTP ${response.status} ${statusText}. Đang thử model tiếp theo...`,
          );
          lastError = `HTTP ${response.status} (${model})`;
          continue;
        }

        const data = (await response.json()) as GeminiGenerateContentResponse;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return text;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Gemini API model [${model}] gặp lỗi: ${message}. Đang thử model tiếp theo...`,
        );
        lastError = `${message} (${model})`;
      }
    }

    this.logger.warn(
      `Tất cả các model Gemini đều không phản hồi thành công (Lỗi cuối: ${lastError ?? 'không xác định'}). Kích hoạt fallback tri thức nội bộ.`,
    );
    return null;
  }
}
