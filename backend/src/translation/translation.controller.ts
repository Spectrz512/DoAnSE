import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { Language } from '@prisma/client';
import { TranslationService } from './translation.service.js';

@Controller()
export class TranslationController {
  constructor(private readonly translations: TranslationService) {}

  /**
   * Endpoint công khai lấy danh mục 20 ngôn ngữ được hỗ trợ
   * GET /api/languages
   */
  @Get('languages')
  languages() {
    return this.translations.languages();
  }

  /**
   * Lấy nội dung thuyết minh theo POI và ngôn ngữ
   * GET /api/pois/:poiId/narrations?language=vi
   */
  @Get('pois/:poiId/narrations')
  narration(@Param('poiId') poiId: string, @Query('language') language = 'vi') {
    if (!Object.values(Language).includes(language as Language)) {
      throw new BadRequestException(`Ngôn ngữ '${language}' không nằm trong danh mục 20 ngôn ngữ được hỗ trợ.`);
    }
    return this.translations.narration(poiId, language as Language);
  }
}
