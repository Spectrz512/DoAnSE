import { Injectable } from "@nestjs/common";
import { PoiStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreatePoiDto } from "./dto/create-poi.dto";
@Injectable()
export class PoiRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(dto: CreatePoiDto) {
    return this.prisma.poi.create({
      data: {
        ...dto,
        status: PoiStatus.DRAFT,
        translations: { create: dto.translations },
      },
      include: { translations: true },
    });
  }
  async findNearby(
    latitude: number,
    longitude: number,
    radiusM: number,
    language: string,
  ) {
    return this.prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        latitude: Prisma.Decimal;
        longitude: Prisma.Decimal;
        triggerRadiusM: number;
        title: string;
        description: string;
        audioUrl: string | null;
        imageUrl: string | null;
        distanceM: number;
      }>
    >`
      SELECT p.id, p.slug, p.latitude, p.longitude, p."triggerRadiusM", t.title, t.description, t."audioUrl", t."imageUrl",
        ST_DistanceSphere(ST_MakePoint(p.longitude::float8, p.latitude::float8), ST_MakePoint(${longitude}, ${latitude})) AS "distanceM"
      FROM "Poi" p JOIN "PoiTranslation" t ON t."poiId" = p.id
      WHERE p.status = 'PUBLISHED' AND t.language = ${language}
      AND ST_DWithin(ST_SetSRID(ST_MakePoint(p.longitude::float8, p.latitude::float8), 4326)::geography, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radiusM})
      ORDER BY "distanceM" ASC`;
  }
}
