import { Module } from '@nestjs/common';
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

@Module({
  imports: [PrismaModule, PoiModule, ChatbotModule, TranslationModule, GeoModule, TourModule, ListeningModule, AdminModule, AccessPassModule],
  controllers: [AppController],
})
export class AppModule {}
