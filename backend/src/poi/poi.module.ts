import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { PoiController } from './poi.controller.js';
import { PoiRepository } from './poi.repository.js';
import { PoiService } from './poi.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PoiController],
  providers: [PoiService, PoiRepository],
  exports: [PoiService, PoiRepository],
})
export class PoiModule {}
