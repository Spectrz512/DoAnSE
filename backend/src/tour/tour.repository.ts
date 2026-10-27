import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class TourRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSuggested(language?: Language) {
    return this.prisma.tour.findMany({
      where: { isSuggested: true },
      include: {
        stops: {
          orderBy: { position: 'asc' },
          include: {
            poi: {
              include: language ? { narrations: { where: { language } } } : { narrations: true },
            },
          },
        },
      },
    });
  }

  findAll(language: Language = Language.vi) {
    return this.prisma.tour.findMany({
      include: {
        stops: {
          orderBy: { position: 'asc' },
          include: {
            poi: {
              include: { narrations: { where: { language } } },
            },
          },
        },
      },
    });
  }

  findById(id: string, language?: Language) {
    return this.prisma.tour.findUnique({
      where: { id },
      include: {
        stops: {
          orderBy: { position: 'asc' },
          include: {
            poi: {
              include: language ? { narrations: { where: { language } } } : { narrations: true },
            },
          },
        },
      },
    });
  }

  findPoisByIds(poiIds: string[], language: Language = Language.vi) {
    return this.prisma.poi.findMany({
      where: { id: { in: poiIds } },
      include: {
        narrations: { where: { language } },
      },
    });
  }
}