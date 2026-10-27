import { Injectable, NotFoundException } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
@Injectable()
export class TranslationService {
  constructor(private readonly prisma: PrismaService) {}
  languages() { return [{ code: 'vi', name: 'Tiếng Việt' }, { code: 'en', name: 'English' }, { code: 'ko', name: '한국어' }]; }
  async narration(poiId: string, language: Language) {
    const narration = await this.prisma.narration.findUnique({ where: { poiId_language: { poiId, language } } });
    if (!narration) throw new NotFoundException('Narration is not available for this POI and language');
    return narration;
  }
}
