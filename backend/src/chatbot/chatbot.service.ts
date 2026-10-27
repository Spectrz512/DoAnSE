import { Injectable } from '@nestjs/common';
import { ChatDto } from './dto.js';

/** Replace this deterministic fallback with an approved AI provider adapter when credentials are available. */
@Injectable()
export class ChatbotService {
  reply(dto: ChatDto) {
    return { answer: `Tôi đã nhận câu hỏi: ${dto.message}`, provider: 'local-fallback', disclaimer: 'Chức năng tư vấn tự động đang ở chế độ cơ bản.' };
  }
}
