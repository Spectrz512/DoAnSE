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
