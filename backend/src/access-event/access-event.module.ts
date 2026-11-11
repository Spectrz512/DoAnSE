import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { AccessEventController } from './access-event.controller.js';
import { AccessEventRepository } from './access-event.repository.js';
import { AccessEventService } from './access-event.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AccessEventController],
  providers: [AccessEventService, AccessEventRepository],
  exports: [AccessEventService, AccessEventRepository],
})
export class AccessEventModule {}
