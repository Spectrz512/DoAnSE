import { Body, Controller, Post } from '@nestjs/common';
import { ChatDto } from './dto.js';
import { ChatbotService } from './chatbot.service.js';
@Controller('chatbot') export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}
  @Post('messages') message(@Body() dto: ChatDto) { return this.chatbot.reply(dto); }
}
