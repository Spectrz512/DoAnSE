/**
 * ==============================================================================
 * MODULE: POI (POINT OF INTEREST) & CLOUD TTS PROXY
 * TẦNG: PRESENTATION LAYER (GIAO TIẾP HTTP & ĐỊNH TUYẾN API)
 * ==============================================================================
 * Vai trò:
 * - Tiếp nhận các yêu cầu HTTP từ client (demo/index.html, demo/qr.html).
 * - Cung cấp các endpoint:
 *   + GET /api/pois: Danh sách 13 điểm di tích lịch sử Sài Gòn.
 *   + GET /api/pois/bootstrap: Nạp trọn gói dữ liệu POIs và Tour cho du khách lúc mở app.
 *   + GET /api/pois/tts: Proxy stream âm thanh Google Cloud TTS cho cả 20 ngôn ngữ.
 *   + GET /api/pois/nearby: Lọc các di tích lân cận kèm trạng thái Geofence trigger.
 *   + GET /api/pois/:id: Xem chi tiết một di tích cụ thể.
 * - Điều phối sang: PoiService (Tầng Business Logic).
 * ==============================================================================
 */

import { BadGatewayException, BadRequestException, Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { NearbyPoiQueryDto } from './dto.js';
import { PoiService } from './poi.service.js';

@Controller('pois')
export class PoiController {
  constructor(private readonly service: PoiService) {}

  @Get('bootstrap')
  bootstrap() { return this.service.bootstrap(); }

  @Get('tts')
  async streamTts(
    @Query('lang') lang = 'vi',
    @Query('text') text: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!text || !text.trim()) {
      throw new BadRequestException('Tham số text không được để trống.');
    }
    const audioBuffer = await this.service.generateTtsAudio(text, lang);
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new BadGatewayException('Không thể tạo âm thanh thuyết minh từ máy chủ TTS.');
    }
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audioBuffer.length),
      'Cache-Control': 'public, max-age=86400',
    });
    return new StreamableFile(audioBuffer);
  }

  // 'nearby' phải đứng trước ':id' để NestJS không nhầm 'nearby' là param id
  @Get('nearby')
  findNearby(@Query() query: NearbyPoiQueryDto) {
    return this.service.findNearbyWithTriggerState(query);
  }

  @Get()
  list(@Query('q') query?: string, @Query('category') category?: string) {
    return this.service.list(query, category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
}
