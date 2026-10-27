import { Module } from '@nestjs/common';
import { ListeningController } from './listening.controller.js';
import { ListeningRepository } from './listening.repository.js';
import { ListeningService } from './listening.service.js';

@Module({
  controllers: [ListeningController],
  providers: [ListeningRepository, ListeningService],
  exports: [ListeningRepository, ListeningService],
})
export class ListeningModule {}