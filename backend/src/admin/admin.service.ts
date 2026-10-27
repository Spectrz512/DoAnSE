import { Injectable, NotFoundException } from '@nestjs/common';
import { PoiStatus } from '@prisma/client';
import { CreatePoiDto, UpdatePoiDto } from '../poi/dto.js';
import { PoiRepository } from '../poi/poi.repository.js';
import { AdminRepository } from './admin.repository.js';
import { UpsertNarrationDto } from './dto.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly admin: AdminRepository,
    private readonly pois: PoiRepository,
  ) {}

  getStats() {
    return this.admin.getStats();
  }

  getAuditEvents() {
    return this.admin.listAuditEvents();
  }

  createPoi(dto: CreatePoiDto) {
    return this.admin.createPoi(dto);
  }

  async updatePoi(id: string, dto: UpdatePoiDto) {
    await this.assertPoi(id);
    return this.admin.updatePoi(id, dto);
  }

  async updatePoiStatus(id: string, status: PoiStatus) {
    await this.assertPoi(id);
    return this.admin.updatePoiStatus(id, status);
  }

  async deletePoi(id: string) {
    await this.assertPoi(id);
    return this.admin.deletePoi(id);
  }

  async upsertNarration(poiId: string, dto: UpsertNarrationDto) {
    await this.assertPoi(poiId);
    return this.admin.upsertNarration(poiId, dto);
  }

  private async assertPoi(id: string) {
    const poi = await this.pois.find(id);
    if (!poi) {
      throw new NotFoundException('POI not found');
    }
    return poi;
  }
}