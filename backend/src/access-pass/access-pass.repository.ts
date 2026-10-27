import { Injectable } from '@nestjs/common';
import { Language, PassStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AccessPassRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string) {
    return this.prisma.accessPass.findUnique({
      where: { code },
    });
  }

  create(data: Prisma.AccessPassCreateInput) {
    return this.prisma.accessPass.create({
      data,
    });
  }

  updateStatus(id: string, status: PassStatus, activatedAt?: Date, deviceInfo?: string) {
    return this.prisma.accessPass.update({
      where: { id },
      data: {
        status,
        ...(activatedAt ? { activatedAt } : {}),
        ...(deviceInfo ? { deviceInfo } : {}),
      },
    });
  }

  async getTourPackage(tourId: string | null | undefined, language: Language) {
    // Nếu có tourId thì lấy theo tour, nếu không thì lấy toàn bộ POI kèm narration của ngôn ngữ đó
    const [tours, pois] = await Promise.all([
      this.prisma.tour.findMany({
        where: tourId ? { id: tourId } : {},
        include: {
          stops: {
            orderBy: { position: 'asc' },
            include: { poi: true },
          },
        },
      }),
      this.prisma.poi.findMany({
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
        include: {
          narrations: {
            where: { language },
          },
        },
      }),
    ]);

    return {
      selectedTour: tours.find((t) => t.id === tourId) ?? tours[0] ?? null,
      pois: pois.map((poi) => ({
        id: poi.id,
        name: poi.name,
        description: poi.description,
        latitude: poi.latitude,
        longitude: poi.longitude,
        category: poi.category,
        address: poi.address,
        activationRadius: poi.activationRadius,
        priority: poi.priority,
        imageUrl: poi.imageUrl,
        narration: poi.narrations[0] ?? null,
      })),
    };
  }
}
