import { Injectable } from '@nestjs/common';
import { Language } from '@prisma/client';
import { GeoRepository } from './geo.repository.js';

@Injectable()
export class GeoService {
  constructor(private readonly geoRepository: GeoRepository) {}

  async candidates(latitude: number, longitude: number, language: Language) {
    const nearby = await this.geoRepository.findNearbyPois(
      latitude,
      longitude,
      1000,
      language,
    );

    // Chỉ trả về POI nằm trong activationRadius của nó
    return nearby
      .filter((poi) => poi.distanceM <= poi.activationRadius)
      .map((poi) => ({
        poiId: poi.id,
        name: poi.name,
        distanceMetres: poi.distanceM,
        activationRadius: poi.activationRadius,
        priority: poi.priority,
        narration: poi.narration,
      }));
  }
}
