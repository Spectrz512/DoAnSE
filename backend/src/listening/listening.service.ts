import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateListeningEventDto, VisitorHeartbeatDto, VisitorLeaveDto } from './dto.js';
import { ListeningRepository } from './listening.repository.js';

@Injectable()
export class ListeningService {
  constructor(private readonly repository: ListeningRepository) {}

  async create(dto: CreateListeningEventDto) {
    const poi = await this.repository.findPoiById(dto.poiId);
    if (!poi) {
      throw new NotFoundException(`POI with ID [${dto.poiId}] not found`);
    }

    return this.repository.create({
      poiId: dto.poiId,
      language: dto.language,
      mode: dto.mode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      visitorId: dto.visitorId,
    });
  }

  history(visitorId?: string) {
    return this.repository.findHistory(visitorId);
  }

  heartbeat(dto: VisitorHeartbeatDto) {
    return this.repository.upsertHeartbeat({
      visitorId: dto.visitorId,
      passCode: dto.passCode,
      language: dto.language,
      currentPoiId: dto.currentPoiId,
      deviceInfo: dto.deviceInfo,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isSpeaking: dto.isSpeaking,
    });
  }

  async leave(dto: VisitorLeaveDto) {
    await this.repository.markLeave(dto.visitorId);
    return { ok: true, visitorId: dto.visitorId, leftAt: new Date() };
  }

  getActiveVisitors(withinSeconds = 60) {
    return this.repository.getActiveSessions(withinSeconds);
  }
}