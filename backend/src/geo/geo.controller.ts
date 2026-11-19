/**
 * ==============================================================================
 * MODULE: GEO SPATIAL (ĐỊNH VỊ KHÔNG GIAN ĐỊA LÝ)
 * TẦNG: PRESENTATION LAYER (GIAO TIẾP HTTP)
 * ==============================================================================
 * Vai trò:
 * - Tiếp nhận tọa độ du khách từ GPS và tìm kiếm ứng viên Geofence lân cận
 *   (GET /api/geo/trigger-candidates?lat=&lng=&language=vi).
 * ==============================================================================
 */

import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Language } from '@prisma/client';
import { GeoService } from './geo.service.js';
const supported = new Set(Object.values(Language));
@Controller('geo')
export class GeoController {
  constructor(private readonly geo: GeoService) {}
  @Get('trigger-candidates')
  candidates(@Query('lat') lat: string, @Query('lng') lng: string, @Query('language') language = 'vi') {
    const latitude = Number(lat); const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !supported.has(language as Language)) throw new BadRequestException('lat, lng and supported language are required');
    return this.geo.candidates(latitude, longitude, language as Language);
  }
}
