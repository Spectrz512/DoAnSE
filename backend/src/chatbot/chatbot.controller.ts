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
