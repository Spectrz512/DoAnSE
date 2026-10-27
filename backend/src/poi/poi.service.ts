import { Injectable, NotFoundException } from '@nestjs/common';
import { Language } from '@prisma/client';
import { CreatePoiDto, NearbyPoiQueryDto } from './dto.js';
import { PoiRepository } from './poi.repository.js';

@Injectable()
export class PoiService {
  constructor(private readonly pois: PoiRepository) {}

  bootstrap() { return this.pois.bootstrap(); }

  list(query?: string, category?: string) { return this.pois.list(query, category); }

  async findOne(id: string) {
    const poi = await this.pois.find(id);
    if (!poi) throw new NotFoundException('POI not found');
    return poi;
  }

  create(dto: CreatePoiDto) { return this.pois.create(dto); }

  async findNearbyWithTriggerState(query: NearbyPoiQueryDto) {
    const lat = query.lat;
    const lng = query.lng;
    const radiusM = query.radiusM ?? 500;
    const language = query.language ?? Language.vi;

    const playedSet = new Set(
      (query.playedPoiIds ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );

    // Mở rộng vùng tìm kiếm (tối thiểu 5000m) để kiểm tra các POI đã phát nhưng người dùng vừa rời bán kính
    const checkRange = Math.max(radiusM, 5000);
    const allPoisInCheckRange = await this.pois.findNearby(lat, lng, checkRange, language);

    // POI đã phát và người dùng đã đi xa >= 1.5 * triggerRadiusM → đưa vào resetPoiIds, xóa khỏi playedSet
    const resetPoiIds: string[] = [];
    for (const poi of allPoisInCheckRange) {
      if (playedSet.has(poi.id) && poi.distanceM >= poi.resetRadiusM) {
        resetPoiIds.push(poi.id);
        playedSet.delete(poi.id);
      }
    }

    const nearbyItems = allPoisInCheckRange
      .filter((poi) => poi.distanceM <= radiusM)
      .map((poi) => {
        const isPlayed = playedSet.has(poi.id);
        const withinTrigger = poi.distanceM <= poi.triggerRadiusM;
        return {
          ...poi,
          isPlayed,
          withinTrigger,
          shouldTrigger: withinTrigger && !isPlayed,
        };
      });

    const nextTriggerPoi = nearbyItems.find((item) => item.shouldTrigger) ?? null;

    return {
      userLocation: { lat, lng },
      radiusM,
      language,
      resetPoiIds,
      activePlayedPoiIds: [...playedSet],
      nextTriggerPoi,
      items: nearbyItems,
    };
  }
}
