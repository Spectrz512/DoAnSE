/**
 * ==============================================================================
 * MODULE: AI CHATBOT (HƯỚNG DẪN VIÊN DU LỊCH AI SÀI GÒN)
 * TẦNG: PRESENTATION LAYER (GIAO TIẾP HTTP & BẢO VỆ RATE LIMIT)
 * ==============================================================================
 * Vai trò:
 * - Tiếp nhận câu hỏi trò chuyện từ du khách tại demo/index.html (POST /api/chatbot/messages).
 * - Bảo vệ hệ thống bằng RateLimitGuard (giới hạn tối đa 20 câu hỏi / phút mỗi IP).
 * - Điều phối sang: ChatbotService (Tầng Business Logic Hybrid RAG).
 * ==============================================================================
 */

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RateLimit } from '../auth/rate-limit.decorator.js';
import { RateLimitGuard } from '../auth/rate-limit.guard.js';
import { ChatbotService } from './chatbot.service.js';
import { ChatDto } from './dto.js';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @Post('messages')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000 })
  message(@Body() dto: ChatDto) {
    return this.chatbot.reply(dto);
  }
}
