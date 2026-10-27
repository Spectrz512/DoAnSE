import { Injectable } from '@nestjs/common';
import { Language, ListeningMode, PoiStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreatePoiDto, UpdatePoiDto } from '../poi/dto.js';
import { UpsertNarrationDto } from './dto.js';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

    const [
      totalPois,
      publishedPois,
      draftPois,
      totalNarrations,
      totalTours,
      totalListeningEvents,
      activeVisitorsCount,
      activeVisitorSessions,
      topPois,
      modeGroups,
      languageGroups,
      recentEvents,
      recentAudits,
    ] = await Promise.all([
      this.prisma.poi.count(),
      this.prisma.poi.count({ where: { status: PoiStatus.PUBLISHED } }),
      this.prisma.poi.count({ where: { status: PoiStatus.DRAFT } }),
      this.prisma.narration.count(),
      this.prisma.tour.count(),
      this.prisma.listeningEvent.count(),
      this.prisma.visitorSession.count({
        where: {
          isActive: true,
          lastSeenAt: { gte: sixtySecondsAgo },
        },
      }),
      this.prisma.visitorSession.findMany({
        where: {
          isActive: true,
          lastSeenAt: { gte: sixtySecondsAgo },
        },
        orderBy: { lastSeenAt: 'desc' },
        take: 50,
      }),
      this.prisma.listeningEvent.groupBy({
        by: ['poiId'],
        _count: { poiId: true },
        orderBy: { _count: { poiId: 'desc' } },
        take: 5,
      }),
      this.prisma.listeningEvent.groupBy({
        by: ['mode'],
        _count: { mode: true },
      }),
      this.prisma.listeningEvent.groupBy({
        by: ['language'],
        _count: { language: true },
      }),
      this.prisma.listeningEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { poi: { select: { id: true, name: true } } },
      }),
      this.prisma.auditEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const topPoiIds = topPois.map((p) => p.poiId);
    const topPoiDetails = await this.prisma.poi.findMany({
      where: { id: { in: topPoiIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(topPoiDetails.map((p) => [p.id, p.name]));

    const byMode: Record<ListeningMode, number> = {
      AUTO: 0,
      MANUAL: 0,
    };
    for (const item of modeGroups) {
      byMode[item.mode] = item._count.mode;
    }

    const byLanguage: Record<Language, number> = {
      vi: 0,
      en: 0,
      ko: 0,
      ja: 0,
      zh: 0,
    };
    for (const item of languageGroups) {
      byLanguage[item.language] = item._count.language;
    }

    return {
      totalPois,
      publishedPois,
      draftPois,
      totalNarrations,
      totalTours,
      totalListeningEvents,
      activeVisitorsCount,
      activeVisitorSessions,
      byMode,
      byLanguage,
      topPois: topPois.map((p) => ({
        poiId: p.poiId,
        name: nameMap.get(p.poiId) ?? '',
        count: p._count.poiId,
      })),
      recentEvents,
      recentAudits,
    };
  }

  async createPoi(dto: CreatePoiDto) {
    const poi = await this.prisma.poi.create({
      data: {
        name: dto.name,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        category: dto.category,
        address: dto.address,
        activationRadius: dto.activationRadius,
        priority: dto.priority,
        imageUrl: dto.imageUrl,
        status: dto.status ?? PoiStatus.PUBLISHED,
      },
    });
    await this.recordAudit('CREATE_POI', 'POI', poi.id, { name: poi.name, status: poi.status });
    return poi;
  }

  async updatePoi(id: string, dto: UpdatePoiDto) {
    const poi = await this.prisma.poi.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.activationRadius !== undefined ? { activationRadius: dto.activationRadius } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
    await this.recordAudit('UPDATE_POI', 'POI', poi.id, { name: poi.name, status: poi.status });
    return poi;
  }

  async updatePoiStatus(id: string, status: PoiStatus) {
    const poi = await this.prisma.poi.update({
      where: { id },
      data: { status },
    });
    const action = status === PoiStatus.PUBLISHED ? 'PUBLISH_POI' : 'DRAFT_POI';
    await this.recordAudit(action, 'POI', poi.id, { status });
    return poi;
  }

  async deletePoi(id: string) {
    const deleted = await this.prisma.poi.delete({ where: { id } });
    await this.recordAudit('DELETE_POI', 'POI', id, { name: deleted.name });
    return deleted;
  }

  async upsertNarration(poiId: string, dto: UpsertNarrationDto) {
    const data = {
      title: dto.title,
      content: dto.content,
      audioUrl: dto.audioUrl,
      durationSeconds: dto.durationSeconds,
    };
    const narration = await this.prisma.narration.upsert({
      where: { poiId_language: { poiId, language: dto.language } },
      create: { poiId, language: dto.language, ...data },
      update: data,
    });
    await this.recordAudit('UPSERT_NARRATION', 'NARRATION', narration.id, {
      poiId,
      language: dto.language,
      title: dto.title,
    });
    return narration;
  }

  listAuditEvents(take = 50) {
    return this.prisma.auditEvent.findMany({
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  recordAudit(action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
    return this.prisma.auditEvent.create({
      data: {
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }
}