import { Injectable } from '@nestjs/common';
import { Language, PoiStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreatePoiDto, UpdatePoiDto } from './dto.js';

export interface NearbyPoiCandidate {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  category: string;
  address: string | null;
  activationRadius: number;
  priority: number;
  imageUrl: string | null;
  distanceM: number;
  triggerRadiusM: number;
  resetRadiusM: number;
  narration: {
    id: string;
    language: Language;
    title: string;
    content: string;
    audioUrl: string | null;
    durationSeconds: number | null;
  } | null;
}

@Injectable()
export class PoiRepository {
  constructor(private readonly prisma: PrismaService) {}

  bootstrap() {
    return Promise.all([
      this.prisma.poi.findMany({
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
        include: { narrations: true },
      }),
      this.prisma.tour.findMany({
        include: { stops: { orderBy: { position: 'asc' }, include: { poi: true } } },
      }),
    ]).then(([pois, tours]) => ({ pois, tours }));
  }

  list(query?: string, category?: string) {
    return this.prisma.poi.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { address: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  find(id: string) {
    return this.prisma.poi.findUnique({ where: { id }, include: { narrations: true } });
  }

  create(dto: CreatePoiDto) {
    return this.prisma.poi.create({
      data: {
        name: dto.name,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        category: dto.category,
        imageUrl: dto.imageUrl,
        address: dto.address,
        activationRadius: dto.activationRadius,
        priority: dto.priority,
        status: dto.status ?? PoiStatus.PUBLISHED,
      },
    });
  }

  update(id: string, dto: UpdatePoiDto) {
    return this.prisma.poi.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
        ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.activationRadius !== undefined ? { activationRadius: dto.activationRadius } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  updateStatus(id: string, status: PoiStatus) {
    return this.prisma.poi.update({
      where: { id },
      data: { status },
    });
  }

  delete(id: string) {
    return this.prisma.poi.delete({ where: { id } });
  }
  findPublishedForKnowledge(query?: string) {
    const terms: string[] = [
      ...new Set(
        (query || '')
          .toLocaleLowerCase('vi')
          .match(/[\p{L}\p{N}]+/gu) || [],
      ),
    ]
      .filter((term) => term.length >= 2)
      .slice(0, 8);

    return this.prisma.poi.findMany({
      where: {
        status: PoiStatus.PUBLISHED,
        ...(terms.length > 0
          ? {
              OR: terms.flatMap((term) => [
                { name: { contains: term, mode: 'insensitive' as const } },
                { address: { contains: term, mode: 'insensitive' as const } },
                { description: { contains: term, mode: 'insensitive' as const } },
              ]),
            }
          : {}),
      },
      include: {
        narrations: true,
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      take: 20,
    });
  }


  async findNearby(
    lat: number,
    lng: number,
    radiusM = 500,
    language: Language = Language.vi,
  ): Promise<NearbyPoiCandidate[]> {
    // 1. Thử truy vấn không gian trực tiếp qua PostGIS (ST_DWithin & ST_DistanceSphere)
    try {
      type RawSpatialPoi = {
        id: string;
        name: string;
        description: string;
        latitude: number;
        longitude: number;
        category: string;
        address: string | null;
        activationRadius: number;
        priority: number;
        imageUrl: string | null;
        distanceM: number;
        narrationId: string | null;
        narrationLang: string | null;
        narrationTitle: string | null;
        narrationContent: string | null;
        narrationAudioUrl: string | null;
        narrationDuration: number | null;
      };

      const rawResults = await this.prisma.$queryRaw<RawSpatialPoi[]>`
        SELECT 
          p.id, p.name, p.description, p.latitude, p.longitude, p.category, p.address,
          p."activationRadius", p.priority, p."imageUrl",
          ROUND(CAST(ST_DistanceSphere(ST_MakePoint(p.longitude, p.latitude), ST_MakePoint(${lng}, ${lat})) AS numeric), 2) AS "distanceM",
          n.id AS "narrationId",
          n.language AS "narrationLang",
          n.title AS "narrationTitle",
          n.content AS "narrationContent",
          n."audioUrl" AS "narrationAudioUrl",
          n."durationSeconds" AS "narrationDuration"
        FROM "Poi" p
        LEFT JOIN "Narration" n ON n."poiId" = p.id AND n.language = ${language}::"Language"
        WHERE p.status = 'PUBLISHED'
          AND ST_DWithin(
            ST_MakePoint(p.longitude, p.latitude)::geography,
            ST_MakePoint(${lng}, ${lat})::geography,
            ${radiusM}
          )
        ORDER BY p.priority DESC, "distanceM" ASC
      `;

      if (rawResults && Array.isArray(rawResults)) {
        return rawResults.map((r) => {
          const triggerRadiusM = Number(r.activationRadius);
          const distanceM = Number(r.distanceM);
          return {
            id: r.id,
            name: r.name,
            description: r.description,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            category: r.category,
            address: r.address,
            activationRadius: triggerRadiusM,
            priority: Number(r.priority),
            imageUrl: r.imageUrl,
            distanceM,
            triggerRadiusM,
            resetRadiusM: Math.round(triggerRadiusM * 1.5 * 100) / 100,
            narration: r.narrationId
              ? {
                  id: r.narrationId,
                  language: (r.narrationLang as Language) || language,
                  title: r.narrationTitle || '',
                  content: r.narrationContent || '',
                  audioUrl: r.narrationAudioUrl,
                  durationSeconds: r.narrationDuration ? Number(r.narrationDuration) : null,
                }
              : null,
          };
        });
      }
    } catch {
      // 2. Hybrid Fallback: Nếu môi trường cơ sở dữ liệu chưa có extension PostGIS hoặc unit test mock
    }

    // Fallback: Haversine in-memory calculation
    const pois = await this.prisma.poi.findMany({
      where: { status: PoiStatus.PUBLISHED },
      include: {
        narrations: { where: { language } },
      },
    });

    const candidates: NearbyPoiCandidate[] = [];

    for (const poi of pois) {
      const distanceM = this.haversine(lat, lng, poi.latitude, poi.longitude);
      if (distanceM <= radiusM) {
        const triggerRadiusM = poi.activationRadius;
        candidates.push({
          id: poi.id,
          name: poi.name,
          description: poi.description,
          latitude: poi.latitude,
          longitude: poi.longitude,
          category: poi.category,
          address: poi.address,
          activationRadius: triggerRadiusM,
          priority: poi.priority,
          imageUrl: poi.imageUrl,
          distanceM: Math.round(distanceM * 100) / 100,
          triggerRadiusM,
          resetRadiusM: Math.round(triggerRadiusM * 1.5 * 100) / 100,
          narration: poi.narrations[0]
            ? {
                id: poi.narrations[0].id,
                language: poi.narrations[0].language,
                title: poi.narrations[0].title,
                content: poi.narrations[0].content,
                audioUrl: poi.narrations[0].audioUrl,
                durationSeconds: poi.narrations[0].durationSeconds,
              }
            : null,
        });
      }
    }

    return candidates.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.distanceM - b.distanceM;
    });
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
