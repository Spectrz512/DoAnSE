import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { Language } from '@prisma/client';
import { TranslationService } from './translation.service.js';
@Controller()
export class TranslationController {
  constructor(private readonly translations: TranslationService) {}
  @Get('languages') languages() { return this.translations.languages(); }
  @Get('pois/:poiId/narrations')
  narration(@Param('poiId') poiId: string, @Query('language') language = 'vi') {
    if (!Object.values(Language).includes(language as Language)) throw new BadRequestException('Unsupported language');
    return this.translations.narration(poiId, language as Language);
  }
}
