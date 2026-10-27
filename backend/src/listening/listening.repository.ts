import { Injectable } from '@nestjs/common';
import { Language, ListeningMode } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

export interface CreateListeningEventInput {
  poiId: string;
  language: Language;
  mode: ListeningMode;
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

  create(input: CreateListeningEventInput) {
    return this.prisma.listeningEvent.create({
      data: {
        poiId: input.poiId,
        language: input.language,
        mode: input.mode,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        visitorId: input.visitorId ?? null,
      },
      include: {
        poi: { select: { id: true, name: true } },
      },
    });
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