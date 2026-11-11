import { Injectable } from '@nestjs/common';
import { ListeningMode, ListeningStatus, PoiStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreatePoiDto, UpdatePoiDto } from '../poi/dto.js';
import { UpsertNarrationDto } from './dto.js';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Thống kê tổng hợp toàn diện phục vụ Admin Dashboard (Nhóm A & Nhóm B)
   */
  async getStats() {
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalVisits,
      todayVisits,
      totalPois,
      publishedPois,
      draftPois,
      totalNarrations,
      totalTours,
      totalListeningEvents,
      activeListeningSessionsCount,
      preparingSessionsCount,
      playingSessionsCount,
      completedSessionsCount,
      errorSessionsCount,
      activeVisitorsCount,
      activeVisitorSessions,
      liveListeningSessions,
      totalLanguages,
      availableLanguagesCount,
      topPois,
      modeGroups,
      languageGroups,
      recentEvents,
      recentAudits,
      recentVisits,
      accessByLang,
      accessBySource,
      accessByDevice,
      visitsLast7Days,
      topVisitedPoisRaw,
    ] = await Promise.all([
      // Lượt truy cập
      this.prisma.accessEvent.count(),
      this.prisma.accessEvent.count({ where: { createdAt: { gte: todayStart } } }),

      // POI & Nội dung
      this.prisma.poi.count(),
      this.prisma.poi.count({ where: { status: PoiStatus.PUBLISHED } }),
      this.prisma.poi.count({ where: { status: PoiStatus.DRAFT } }),
      this.prisma.narration.count(),
      this.prisma.tour.count(),

      // Lượt nghe & Phiên nghe
      this.prisma.listeningEvent.count(),
      this.prisma.listeningSession.count({
        where: {
          status: { in: [ListeningStatus.PLAYING, ListeningStatus.PREPARING] },
          lastHeartbeatAt: { gte: sixtySecondsAgo },
        },
      }),
      this.prisma.listeningSession.count({
        where: {
          status: ListeningStatus.PREPARING,
          lastHeartbeatAt: { gte: sixtySecondsAgo },
        },
      }),
      this.prisma.listeningSession.count({
        where: {
          status: ListeningStatus.PLAYING,
          lastHeartbeatAt: { gte: sixtySecondsAgo },
        },
      }),
      this.prisma.listeningEvent.count({
        where: { status: ListeningStatus.COMPLETED },
      }),
      this.prisma.listeningEvent.count({
        where: { status: ListeningStatus.ERROR },
      }),

      // Telemetry du khách online
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

      // Danh sách phiên nghe trực tiếp
      this.prisma.listeningSession.findMany({
        where: { lastHeartbeatAt: { gte: sixtySecondsAgo } },
        include: { poi: { select: { id: true, name: true } } },
        orderBy: { lastHeartbeatAt: 'desc' },
        take: 50,
      }),

      // Ngôn ngữ
      this.prisma.languageCatalog.count(),
      this.prisma.languageCatalog.count({ where: { isAvailable: true } }),

      // Top POI được nghe
      this.prisma.listeningEvent.groupBy({
        by: ['poiId'],
        _count: { poiId: true },
        orderBy: { _count: { poiId: 'desc' } },
        take: 5,
      }),

      // Phân bổ chế độ & ngôn ngữ nghe
      this.prisma.listeningEvent.groupBy({
        by: ['mode'],
        _count: { mode: true },
      }),
      this.prisma.listeningEvent.groupBy({
        by: ['language'],
        _count: { language: true },
      }),

      // Nhật ký gần nhất
      this.prisma.listeningEvent.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: { poi: { select: { id: true, name: true } } },
      }),
      this.prisma.auditEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.accessEvent.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { poi: { select: { id: true, name: true } } },
      }),

      // Phân tích truy cập
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
      this.prisma.accessEvent.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.accessEvent.groupBy({
        by: ['poiId'],
        where: { poiId: { not: null } },
        _count: { poiId: true },
        orderBy: { _count: { poiId: 'desc' } },
        take: 5,
      }),
    ]);

    // Tính số người nghe đồng thời (distinct visitorId trong phiên đang phát)
    const distinctListeners = new Set(
      liveListeningSessions
        .filter((s) => s.status === ListeningStatus.PLAYING)
        .map((s) => s.visitorId),
    ).size;

    // Lấy tên các POI cho topPois
    const topPoiIds = topPois.map((p) => p.poiId);
    const topVisitedPoiIds = topVisitedPoisRaw
      .map((p) => p.poiId)
      .filter((id): id is string => Boolean(id));

    const allNeededPoiIds = Array.from(new Set([...topPoiIds, ...topVisitedPoiIds]));
    const poiDetails = await this.prisma.poi.findMany({
      where: { id: { in: allNeededPoiIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(poiDetails.map((p) => [p.id, p.name]));

    // Gom dữ liệu lượt nghe theo chế độ
    const byMode: Record<ListeningMode, number> = {
      AUTO: 0,
      MANUAL: 0,
    };
    for (const item of modeGroups) {
      byMode[item.mode] = item._count.mode;
    }

    // Gom dữ liệu lượt nghe theo ngôn ngữ
    const byLanguage: Record<string, number> = {};
    for (const item of languageGroups) {
      byLanguage[item.language] = item._count.language;
    }

    // Xử lý biểu đồ truy cập 7 ngày
    const countsByDate = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      countsByDate.set(key, 0);
    }
    for (const ev of visitsLast7Days) {
      const key = ev.createdAt.toISOString().split('T')[0];
      if (countsByDate.has(key)) {
        countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
      }
    }
    const visitsByDate = Array.from(countsByDate.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      // ══════════════════════════════════════════════
      // NHÓM A — THỐNG KÊ TỔNG QUAN
      // ══════════════════════════════════════════════
      totalVisits,
      todayVisits,
      totalListeningEvents,
      activeListeningSessionsCount,
      concurrentListenersCount: distinctListeners,
      preparingSessionsCount,
      playingSessionsCount,
      completedSessionsCount,
      errorSessionsCount,
      totalPois,
      publishedPois,
      draftPois,
      totalNarrations,
      totalTours,
      totalLanguages: totalLanguages || 20,
      availableLanguagesCount: availableLanguagesCount || 5,
      activeVisitorsCount,

      // ══════════════════════════════════════════════
      // NHÓM B — TRẠNG THÁI NGHE TRỰC TIẾP & CHI TIẾT
      // ══════════════════════════════════════════════
      liveListeningSessions: liveListeningSessions.map((s) => ({
        id: s.id,
        visitorId: s.visitorId,
        poiId: s.poiId,
        poiName: s.poi ? s.poi.name : (nameMap.get(s.poiId) || s.poiId),
        language: s.language,
        mode: s.mode,
        status: s.status,
        startedAt: s.startedAt,
        lastHeartbeatAt: s.lastHeartbeatAt,
        durationSeconds: s.durationSeconds,
        errorMessage: s.errorMessage,
      })),
      activeVisitorSessions,
      byMode,
      byLanguage,
      topPois: topPois.map((p) => ({
        poiId: p.poiId,
        name: nameMap.get(p.poiId) ?? p.poiId,
        count: p._count.poiId,
      })),
      topVisitedPois: topVisitedPoisRaw.map((p) => ({
        poiId: p.poiId ?? '',
        name: (p.poiId && nameMap.get(p.poiId)) || 'Vào trang chủ / Tour',
        count: p._count.poiId,
      })),
      visitsByDate,
      visitsByLanguage: accessByLang.map((b) => ({ language: b.language, count: b._count.language })),
      visitsBySource: accessBySource.map((b) => ({ source: b.source, count: b._count.source })),
      visitsByDevice: accessByDevice.map((b) => ({ deviceType: b.deviceType || 'Unknown', count: b._count.deviceType })),
      recentEvents: recentEvents.map((e) => ({
        ...e,
        poiName: e.poi ? e.poi.name : (nameMap.get(e.poiId) || e.poiId),
      })),
      recentAudits,
      recentVisits,
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