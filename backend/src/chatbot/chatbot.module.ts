import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PoiModule } from '../poi/poi.module.js';
import { ChatbotController } from './chatbot.controller.js';
import { ChatbotService } from './chatbot.service.js';

@Module({
  imports: [AuthModule, PoiModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
