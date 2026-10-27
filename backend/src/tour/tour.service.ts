import { Injectable, NotFoundException } from '@nestjs/common';
import { Language } from '@prisma/client';
import { CustomRouteDto, TourQueryDto } from './dto.js';
import { TourRepository } from './tour.repository.js';

@Injectable()
export class TourService {
  constructor(private readonly repository: TourRepository) {}

  async suggested(language?: Language) {
    const tours = await this.repository.findSuggested(language);
    return tours.map((tour) => this.enrichTourMetrics(tour));
  }

  async getTours(query?: TourQueryDto) {
    const lang = query?.language ?? Language.vi;
    const tours = await this.repository.findAll(lang);
    return tours.map((tour) => this.enrichTourMetrics(tour));
  }

  async detail(id: string, language?: Language) {
    const tour = await this.repository.findById(id, language);
    if (!tour) throw new NotFoundException('Tour not found');
    return this.enrichTourMetrics(tour);
  }

  async plan(poiIds: string[], language: Language = Language.vi, walkingSpeedKmh: number = 4) {
    const pois = await this.repository.findPoisByIds(poiIds, language);
    if (pois.length !== poiIds.length) {
      throw new NotFoundException('One or more POIs were not found');
    }

    const byId = new Map(pois.map((poi) => [poi.id, poi]));
    const orderedPois = poiIds.map((id) => byId.get(id)!);
    const walkingSpeedMps = (walkingSpeedKmh * 1000) / 3600;

    let totalAudioSec = 0;
    let totalWalkSec = 0;
    let totalDistanceM = 0;

    const stops = orderedPois.map((poi, idx) => {
      const narration = poi.narrations?.[0] ?? null;
      const durationSec = narration?.durationSeconds ?? 120;
      totalAudioSec += durationSec;

      let legDistanceM = 0;
      let legWalkSec = 0;

      if (idx > 0) {
        const prev = orderedPois[idx - 1];
        legDistanceM = this.calculateHaversineDistance(
          prev.latitude,
          prev.longitude,
          poi.latitude,
          poi.longitude,
        );
        legWalkSec = Math.round(legDistanceM / walkingSpeedMps);
        totalDistanceM += legDistanceM;
        totalWalkSec += legWalkSec;
      }

      return {
        position: idx + 1,
        poi,
        legDistanceM: Math.round(legDistanceM),
        legWalkSec,
      };
    });

    const calculatedMinutes = Math.max(
      1,
      Math.ceil((totalAudioSec + totalWalkSec) / 60),
    );

    return {
      stops,
      totalStops: stops.length,
      totalDistanceM: Math.round(totalDistanceM),
      totalAudioDurationSec: totalAudioSec,
      totalWalkingDurationSec: totalWalkSec,
      estimatedMinutes: calculatedMinutes,
    };
  }

  createCustomRoute(dto: CustomRouteDto) {
    return this.plan(dto.poiIds, dto.language ?? Language.vi, dto.walkingSpeedKmh ?? 4);
  }

  private enrichTourMetrics(tour: any) {
    let totalDistanceM = 0;
    let totalAudioSec = 0;
    const walkingSpeedMps = (4 * 1000) / 3600;

    const stops = tour.stops ?? [];
    for (let i = 0; i < stops.length; i++) {
      const poi = stops[i].poi;
      const narration = poi?.narrations?.[0] ?? null;
      totalAudioSec += narration?.durationSeconds ?? 120;

      if (i > 0 && stops[i - 1].poi && poi) {
        totalDistanceM += this.calculateHaversineDistance(
          stops[i - 1].poi.latitude,
          stops[i - 1].poi.longitude,
          poi.latitude,
          poi.longitude,
        );
      }
    }

    const totalWalkSec = Math.round(totalDistanceM / walkingSpeedMps);
    const calculatedDurationMin = Math.max(1, Math.ceil((totalAudioSec + totalWalkSec) / 60));

    return {
      ...tour,
      totalStops: stops.length,
      totalDistanceM: Math.round(totalDistanceM),
      calculatedDurationMin,
    };
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}