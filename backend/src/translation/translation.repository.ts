import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class TranslationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLanguages() {
    return this.prisma.languageCatalog.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  findNarration(poiId: string, language: Language) {
    return this.prisma.narration.findUnique({
      where: { poiId_language: { poiId, language } },
    });
  }
}

