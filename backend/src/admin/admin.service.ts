/**
 * ==============================================================================
 * MODULE: ADMIN MANAGEMENT & AUDIT LOGS (QUẢN TRỊ VIÊN)
 * TẦNG: BUSINESS LOGIC LAYER (QUY TẮC NGHIỆP VỤ & GHI NHẬT KÝ KIỂM TOÁN)
 * ==============================================================================
 * Vai trò:
 * - Kiểm tra tính hợp lệ của file upload âm thanh (mimetype audio/*, dung lượng <= 15MB).
 * - Tự động ghi nhận AuditEvent cho mọi thao tác thay đổi dữ liệu của Admin
 *   (CREATE_POI, UPDATE_POI, TOGGLE_POI_STATUS, DELETE_POI, UPLOAD_AUDIO).
 * - Tính toán số liệu thống kê Dashboard và tỷ lệ hoàn thành tham quan.
 * ==============================================================================
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PoiStatus } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { CreatePoiDto, UpdatePoiDto } from '../poi/dto.js';
import { PoiRepository } from '../poi/poi.repository.js';
import { AdminRepository } from './admin.repository.js';
import { UploadAudioDto, type UploadedAudioFile, UpsertNarrationDto } from './dto.js';

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);

function sanitizeAudioFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const base = basename(originalName, extname(originalName))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${Date.now()}-${base || 'audio'}${ext}`;
}

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

  async uploadAudio(file: UploadedAudioFile | undefined, dto?: UploadAudioDto) {
    if (!file || !file.buffer || !file.originalname) {
      throw new BadRequestException('Audio file is required');
    }

    const ext = extname(file.originalname).toLowerCase();
    const mimeType = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_AUDIO_EXTENSIONS.has(ext) || !mimeType.startsWith('audio/')) {
      throw new BadRequestException(
        'Invalid audio format. Supported formats: .mp3, .wav, .ogg, .m4a',
      );
    }

    if (file.size > MAX_AUDIO_SIZE_BYTES || file.buffer.byteLength > MAX_AUDIO_SIZE_BYTES) {
      throw new BadRequestException('Audio file exceeds the 15MB limit');
    }

    if (dto?.poiId) {
      await this.assertPoi(dto.poiId);
    }

    const filename = sanitizeAudioFilename(file.originalname);
    const uploadDir = join(process.cwd(), 'uploads', 'audio');
    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(join(uploadDir, filename), file.buffer);

    const audioUrl = `/uploads/audio/${filename}`;

    if (dto?.poiId && dto?.language) {
      await this.admin.updateNarrationAudio(
        dto.poiId,
        dto.language,
        audioUrl,
        dto.durationSeconds,
      );
    }

    return {
      audioUrl,
      filename,
      size: file.size,
      mimeType: file.mimetype,
      ...(dto?.poiId ? { poiId: dto.poiId } : {}),
      ...(dto?.language ? { language: dto.language } : {}),
    };
  }

  private async assertPoi(id: string) {
    const poi = await this.pois.find(id);
    if (!poi) {
      throw new NotFoundException('POI not found');
    }
    return poi;
  }
}
