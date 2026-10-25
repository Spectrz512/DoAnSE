import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { AccessPassRepository } from "./access-pass.repository";
import { ActivatePassDto } from "./dto/activate-pass.dto";

@Injectable()
export class AccessPassService {
  constructor(private readonly repository: AccessPassRepository) {}

  async activate(dto: ActivatePassDto) {
    const route = await this.repository.findPublishedRouteByQrCode(
      dto.qrCode,
      dto.language,
    );
    if (!route)
      throw new NotFoundException("Tour QR code is invalid or unavailable");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pass = await this.repository.createPass(
      route.id,
      randomUUID(),
      dto.language,
      expiresAt,
    );

    return {
      accessToken: pass.token,
      expiresAt: pass.expiresAt,
      route: {
        slug: route.slug,
        stops: route.stops.map(({ position, poi }) => ({
          position,
          id: poi.id,
          slug: poi.slug,
          latitude: poi.latitude,
          longitude: poi.longitude,
          triggerRadiusM: poi.triggerRadiusM,
          content: poi.translations[0] ?? null,
        })),
      },
    };
  }
}
