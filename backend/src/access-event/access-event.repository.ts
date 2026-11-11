import { Injectable } from '@nestjs/common';
import { AccessSource, Language } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

export interface CreateAccessEventInput {
  visitorId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  language?: Language;
  poiId?: string;
  source?: AccessSource;
  path?: string;
}

@Injectable()
export class AccessEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAccessEventInput) {
    const event = await this.prisma.accessEvent.create({
      data: {
        visitorId: input.visitorId,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        deviceType: input.deviceType ?? 'Mobile',
        language: input.language ?? Language.vi,
        poiId: input.poiId ?? null,
        source: input.source ?? AccessSource.DIRECT,
        path: input.path ?? null,
      },
    });

    // Nếu truy cập từ QR Code, tự động cập nhật số lần quét (scanCount)
    if (input.poiId) {
      await this.prisma.qrCode
        .updateMany({
          where: { targetPoiId: input.poiId },
          data: {
            scanCount: { increment: 1 },
            lastScannedAt: new Date(),
          },
        })
        .catch(() => {});
    }

    return event;
  }

  async countTotal() {
    return this.prisma.accessEvent.count();
  }

  async countToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.accessEvent.count({
      where: { createdAt: { gte: today } },
    });
  }

  async getRecent(take = 50) {
    return this.prisma.accessEvent.findMany({
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        poi: { select: { id: true, name: true } },
      },
    });
  }

  async getVisitsByDate(days = 7) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    sinceDate.setHours(0, 0, 0, 0);

    const events = await this.prisma.accessEvent.findMany({
      where: { createdAt: { gte: sinceDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const countsByDate = new Map<string, number>();
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - i));
      const key = d.toISOString().split('T')[0];
      countsByDate.set(key, 0);
    }

    for (const ev of events) {
      const key = ev.createdAt.toISOString().split('T')[0];
      countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
    }

    return Array.from(countsByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  async getBreakdowns() {
    const [byLanguage, bySource, byDevice] = await Promise.all([
      this.prisma.accessEvent.groupBy({
        by: ['language'],
        _count: { language: true },
      }),
      this.prisma.accessEvent.groupBy({
        by: ['source'],
        _count: { source: true },
      }),
      this.prisma.accessEvent.groupBy({
        by: ['deviceType'],
        _count: { deviceType: true },
      }),
    ]);

    return {
      byLanguage: byLanguage.map((b) => ({ language: b.language, count: b._count.language })),
      bySource: bySource.map((b) => ({ source: b.source, count: b._count.source })),
      byDevice: byDevice.map((b) => ({ deviceType: b.deviceType || 'Unknown', count: b._count.deviceType })),
    };
  }
}
