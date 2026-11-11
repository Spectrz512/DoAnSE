import { Module } from '@nestjs/common';
import { TranslationController } from './translation.controller.js';
import { TranslationRepository } from './translation.repository.js';
import { TranslationService } from './translation.service.js';

@Module({
  controllers: [TranslationController],
  providers: [TranslationService, TranslationRepository],
  exports: [TranslationService, TranslationRepository],
})
export class TranslationModule {}
