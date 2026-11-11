import { Injectable } from '@nestjs/common';
import { Language, ListeningMode, ListeningStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

export interface CreateListeningEventInput {
  poiId: string;
  language: Language;
  mode: ListeningMode;
  status?: ListeningStatus;
  durationSeconds?: number;
  errorMessage?: string;
  latitude?: number;
  longitude?: number;
  visitorId?: string;
}

@Injectable()
export class ListeningRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPoiById(poiId: string) {
    return this.prisma.poi.findUnique({
      where: { id: poiId },
      select: { id: true, name: true },
    });
  }

  /**
   * Tạo bản ghi lượt nghe với cơ chế chống gửi lặp (anti-duplicate) trong vòng 4 giây.
   */
  async create(input: CreateListeningEventInput) {
    if (input.visitorId) {
      const fourSecondsAgo = new Date(Date.now() - 4000);
      const recentDup = await this.prisma.listeningEvent.findFirst({
        where: {
          visitorId: input.visitorId,
          poiId: input.poiId,
          language: input.language,
          createdAt: { gte: fourSecondsAgo },
        },
        include: {
          poi: { select: { id: true, name: true } },
        },
      });

      if (recentDup) {
        return recentDup;
      }
    }

    return this.prisma.listeningEvent.create({
      data: {
        poiId: input.poiId,
        language: input.language,
        mode: input.mode,
        status: input.status ?? ListeningStatus.COMPLETED,
        durationSeconds: input.durationSeconds ?? 0,
        errorMessage: input.errorMessage ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        visitorId: input.visitorId ?? null,
      },
      include: {
        poi: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Khởi tạo hoặc cập nhật phiên nghe trực tiếp (ListeningSession).
   */
  async startSession(data: {
    visitorId: string;
    poiId: string;
    language: Language;
    mode?: ListeningMode;
    status?: ListeningStatus;
  }) {
    const now = new Date();
    const existing = await this.prisma.listeningSession.findFirst({
      where: {
        visitorId: data.visitorId,
        poiId: data.poiId,
        status: { in: [ListeningStatus.PREPARING, ListeningStatus.PLAYING] },
      },
    });

    if (existing) {
      return this.prisma.listeningSession.update({
        where: { id: existing.id },
        data: {
          language: data.language,
          mode: data.mode ?? existing.mode,
          status: data.status ?? ListeningStatus.PLAYING,
          lastHeartbeatAt: now,
        },
        include: { poi: { select: { id: true, name: true } } },
      });
    }

    return this.prisma.listeningSession.create({
      data: {
        visitorId: data.visitorId,
        poiId: data.poiId,
        language: data.language,
        mode: data.mode ?? ListeningMode.AUTO,
        status: data.status ?? ListeningStatus.PLAYING,
        startedAt: now,
        lastHeartbeatAt: now,
      },
      include: { poi: { select: { id: true, name: true } } },
    });
  }

  /**
   * Cập nhật tiến trình phiên nghe (heartbeat & thời lượng).
   */
  async updateSession(data: {
    visitorId: string;
    poiId: string;
    durationSeconds?: number;
    status?: ListeningStatus;
    errorMessage?: string;
  }) {
    const now = new Date();
    const session = await this.prisma.listeningSession.findFirst({
      where: {
        visitorId: data.visitorId,
        poiId: data.poiId,
        status: { in: [ListeningStatus.PREPARING, ListeningStatus.PLAYING] },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) return null;

    return this.prisma.listeningSession.update({
      where: { id: session.id },
      data: {
        lastHeartbeatAt: now,
        ...(data.durationSeconds !== undefined ? { durationSeconds: data.durationSeconds } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.errorMessage !== undefined ? { errorMessage: data.errorMessage } : {}),
      },
      include: { poi: { select: { id: true, name: true } } },
    });
  }

  /**
   * Kết thúc phiên nghe và ghi nhận lượt nghe hoàn chỉnh vào ListeningEvent.
   */
  async endSession(data: {
    visitorId: string;
    poiId: string;
    durationSeconds?: number;
    status?: ListeningStatus;
    errorMessage?: string;
  }) {
    const now = new Date();
    const session = await this.prisma.listeningSession.findFirst({
      where: {
        visitorId: data.visitorId,
        poiId: data.poiId,
        status: { in: [ListeningStatus.PREPARING, ListeningStatus.PLAYING] },
      },
      orderBy: { startedAt: 'desc' },
    });

    const finalStatus = data.status ?? ListeningStatus.COMPLETED;
    const finalDuration = data.durationSeconds ?? (session ? session.durationSeconds : 0);

    if (session) {
      await this.prisma.listeningSession.update({
        where: { id: session.id },
        data: {
          status: finalStatus,
          endedAt: now,
          lastHeartbeatAt: now,
          durationSeconds: finalDuration,
          errorMessage: data.errorMessage ?? null,
        },
      });
    }

    // Ghi nhận sự kiện nghe chính thức
    return this.create({
      poiId: data.poiId,
      visitorId: data.visitorId,
      language: session ? session.language : Language.vi,
      mode: session ? session.mode : ListeningMode.AUTO,
      status: finalStatus,
      durationSeconds: finalDuration,
      errorMessage: data.errorMessage,
    });
  }

  /**
   * Lấy danh sách các phiên nghe đang hoạt động (trong vòng 45 giây qua).
   */
  async getActiveListeningSessions(withinSeconds = 45) {
    const threshold = new Date(Date.now() - withinSeconds * 1000);
    return this.prisma.listeningSession.findMany({
      where: {
        status: { in: [ListeningStatus.PLAYING, ListeningStatus.PREPARING] },
        lastHeartbeatAt: { gte: threshold },
      },
      include: {
        poi: { select: { id: true, name: true } },
      },
      orderBy: { lastHeartbeatAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Chức năng nhân đôi lượt nghe dùng trong môi trường kiểm thử tải (Dev/Test Simulation).
   * Nhân bản tối đa N bản ghi gần nhất với hậu tố '-SIM' để không làm sai lệch số liệu thực tế.
   */
  async simulateDoubleEvents(limit = 20) {
    const recent = await this.prisma.listeningEvent.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    if (recent.length === 0) return { duplicatedCount: 0 };

    const simulatedRows = recent.map((r) => ({
      visitorId: r.visitorId ? `${r.visitorId}-SIM` : 'SIM-VISITOR',
      poiId: r.poiId,
      language: r.language,
      mode: r.mode,
      status: r.status,
      durationSeconds: r.durationSeconds ?? 0,
      latitude: r.latitude,
      longitude: r.longitude,
      errorMessage: r.errorMessage,
      createdAt: new Date(),
    }));

    await this.prisma.listeningEvent.createMany({
      data: simulatedRows,
    });

    return {
      duplicatedCount: simulatedRows.length,
      message: `Đã nhân bản ${simulatedRows.length} sự kiện nghe cho mục đích kiểm thử tải.`,
    };
  }

  findHistory(visitorId?: string, take = 100) {
    return this.prisma.listeningEvent.findMany({
      where: visitorId ? { visitorId } : {},
      include: {
        poi: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async upsertHeartbeat(data: {
    visitorId: string;
    passCode?: string;
    language?: Language;
    currentPoiId?: string;
    deviceInfo?: string;
    latitude?: number;
    longitude?: number;
    isSpeaking?: boolean;
  }) {
    const now = new Date();
    return this.prisma.visitorSession.upsert({
      where: { visitorId: data.visitorId },
      create: {
        visitorId: data.visitorId,
        passCode: data.passCode ?? null,
        language: data.language ?? Language.vi,
        deviceInfo: data.deviceInfo ?? null,
        lastActivePoiId: data.currentPoiId ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        isSpeaking: data.isSpeaking ?? false,
        connectedAt: now,
        lastSeenAt: now,
        isActive: true,
      },
      update: {
        ...(data.passCode !== undefined ? { passCode: data.passCode } : {}),
        ...(data.language !== undefined ? { language: data.language } : {}),
        ...(data.deviceInfo !== undefined ? { deviceInfo: data.deviceInfo } : {}),
        ...(data.currentPoiId !== undefined ? { lastActivePoiId: data.currentPoiId } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        ...(data.isSpeaking !== undefined ? { isSpeaking: data.isSpeaking } : {}),
        lastSeenAt: now,
        isActive: true,
      },
    });
  }

  async markLeave(visitorId: string) {
    try {
      return await this.prisma.visitorSession.update({
        where: { visitorId },
        data: {
          isActive: false,
          lastSeenAt: new Date(0),
        },
      });
    } catch {
      return null;
    }
  }

  getActiveSessions(withinSeconds = 60) {
    const threshold = new Date(Date.now() - withinSeconds * 1000);
    return this.prisma.visitorSession.findMany({
      where: {
        isActive: true,
        lastSeenAt: { gte: threshold },
      },
      orderBy: { lastSeenAt: 'desc' },
      take: 100,
    });
  }
}