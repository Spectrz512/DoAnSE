import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PoiRepository } from '../poi/poi.repository.js';

/**
 * GeoRepository: Tầng Data Access của GeoModule.
 * Tái sử dụng PoiRepository.findNearby() thay vì gọi Prisma trực tiếp,
 * đảm bảo kiến trúc 3 lớp: GeoController → GeoService → GeoRepository → PoiRepository → Prisma.
 */
@Injectable()
export class GeoRepository {
  constructor(private readonly poiRepository: PoiRepository) {}

  findNearbyPois(lat: number, lng: number, radiusM: number, language: Language) {
    return this.poiRepository.findNearby(lat, lng, radiusM, language);
  }
}
