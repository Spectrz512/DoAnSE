/**
 * ==============================================================================
 * ROOT APPLICATION MODULE (MÔ-ĐUN GỐC CỦA TOÀN BỘ BACKEND)
 * ==============================================================================
 * Vai trò:
 * - Đóng vai trò là trung tâm liên kết toàn bộ 10 Feature Modules của hệ thống:
 *   PoiModule, ChatbotModule, AdminModule, ListeningModule, TourModule,
 *   TranslationModule, GeoModule, AccessEventModule, AccessPassModule, DatabaseModule.
 * ==============================================================================
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { PrismaModule } from './database/prisma.module.js';
import { PoiModule } from './poi/poi.module.js';
import { ChatbotModule } from './chatbot/chatbot.module.js';
import { TranslationModule } from './translation/translation.module.js';
import { GeoModule } from './geo/geo.module.js';
import { TourModule } from './tour/tour.module.js';
import { ListeningModule } from './listening/listening.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AccessPassModule } from './access-pass/access-pass.module.js';
import { AccessEventModule } from './access-event/access-event.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env', '../.env'],
    }),
    PrismaModule,
    PoiModule,
    ChatbotModule,
    TranslationModule,
    GeoModule,
    TourModule,
    ListeningModule,
    AdminModule,
    AccessPassModule,
    AccessEventModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
