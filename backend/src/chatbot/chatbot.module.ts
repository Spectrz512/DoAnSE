import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller.js';
import { ChatbotService } from './chatbot.service.js';
@Module({ controllers: [ChatbotController], providers: [ChatbotService] }) export class ChatbotModule {}
