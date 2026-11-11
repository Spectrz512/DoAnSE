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

  /**
   * UC8: Tải trọn gói dữ liệu Tour ngoại tuyến (Offline Package)
   * Gồm thông tin tour, các điểm dừng (stops), thông tin POI đầy đủ và bản dịch/audio tương ứng.
   */
  async findTourPackage(tourId: string, language: Language = Language.vi) {
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        stops: {
          orderBy: { position: 'asc' },
          include: {
            poi: {
              include: {
                narrations: { where: { language } },
              },
            },
          },
        },
      },
    });

    if (!tour) return null;

    const stops = tour.stops || [];
    const pois = stops.map((s) => s.poi).filter(Boolean);

    return {
      tour: {
        id: tour.id,
        name: tour.name,
        description: tour.description,
        isSuggested: tour.isSuggested,
        estimatedMinutes: tour.estimatedMinutes,
        totalStops: stops.length,
      },
      language,
      downloadedAt: new Date().toISOString(),
      stops: stops.map((s) => ({
        id: s.id,
        position: s.position,
        poiId: s.poiId,
      })),
      pois: pois.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        latitude: p.latitude,
        longitude: p.longitude,
        category: p.category,
        address: p.address,
        activationRadius: p.activationRadius,
        priority: p.priority,
        imageUrl: p.imageUrl,
        status: p.status,
        narration: p.narrations?.[0] ?? null,
      })),
    };
  }
}
