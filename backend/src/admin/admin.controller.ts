/**
 * ==============================================================================
 * MODULE: ADMIN MANAGEMENT & AUDIT LOGS (QUẢN TRỊ VIÊN)
 * TẦNG: PRESENTATION LAYER (GIAO TIẾP HTTP & XÁC THỰC ADMIN KEY)
 * ==============================================================================
 * Vai trò:
 * - Tiếp nhận các yêu cầu quản trị từ demo/admin.html.
 * - Được bảo vệ 100% bởi AdminKeyGuard (yêu cầu header 'x-admin-key' hợp lệ).
 * - Cung cấp các endpoint:
 *   + GET /api/admin/stats: Thống kê KPI Dashboard và đếm du khách online.
 *   + GET /api/admin/audit-events: Xem lịch sử nhật ký kiểm toán thao tác quản trị.
 *   + POST/PUT/PATCH/DELETE /api/admin/pois: Thao tác CRUD địa điểm di tích.
 *   + POST /api/admin/upload-audio: Upload file âm thanh thuyết minh MP3 (<= 15MB).
 * ==============================================================================
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreatePoiDto } from '../poi/dto.js';
import { AdminKeyGuard } from './admin-key.guard.js';
import { AdminService } from './admin.service.js';
import { UpdatePoiStatusDto, UploadAudioDto, type UploadedAudioFile, UpsertNarrationDto } from './dto.js';

@Controller('admin')
@UseGuards(AdminKeyGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  getStats() {
    return this.admin.getStats();
  }

  @Get('audit-events')
  getAuditEvents() {
    return this.admin.getAuditEvents();
  }

  @Post('pois')
  createPoi(@Body() dto: CreatePoiDto) {
    return this.admin.createPoi(dto);
  }

  @Put('pois/:id')
  updatePoi(@Param('id') id: string, @Body() dto: CreatePoiDto) {
    return this.admin.updatePoi(id, dto);
  }

  @Patch('pois/:id/status')
  updatePoiStatus(@Param('id') id: string, @Body() dto: UpdatePoiStatusDto) {
    return this.admin.updatePoiStatus(id, dto.status);
  }

  @Delete('pois/:id')
  deletePoi(@Param('id') id: string) {
    return this.admin.deletePoi(id);
  }

  @Put('pois/:id/narrations')
  narration(@Param('id') id: string, @Body() dto: UpsertNarrationDto) {
    return this.admin.upsertNarration(id, dto);
  }

  @Post('upload-audio')
  @UseInterceptors(FileInterceptor('file'))
  uploadAudio(
    @UploadedFile() file: UploadedAudioFile | undefined,
    @Body() dto: UploadAudioDto,
  ) {
    return this.admin.uploadAudio(file, dto);
  }

  @Post('pois/:id/audio')
  @UseInterceptors(FileInterceptor('file'))
  uploadPoiAudio(
    @Param('id') id: string,
    @UploadedFile() file: UploadedAudioFile | undefined,
    @Body() dto: UploadAudioDto,
  ) {
    return this.admin.uploadAudio(file, {
      poiId: id,
      language: dto.language,
      durationSeconds: dto.durationSeconds,
    });
  }
}
