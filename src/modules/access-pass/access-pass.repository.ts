import { Injectable } from "@nestjs/common";
import { AccessPassStatus, PoiStatus } from "@prisma/client";
import { PrismaService } from "../../shared/prisma/prisma.service";

@Injectable()
export class AccessPassRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublishedRouteByQrCode(qrCode: string, language: string) {
    return this.prisma.tourRoute.findFirst({
      where: { qrCode, status: PoiStatus.PUBLISHED },
      include: {
        stops: {
          orderBy: { position: "asc" },
          where: { poi: { status: PoiStatus.PUBLISHED } },
          include: {
            poi: {
              include: { translations: { where: { language } } },
            },
          },
        },
      },
    });
  }

  createPass(
    routeId: string,
    token: string,
    language: string,
    expiresAt: Date,
  ) {
    return this.prisma.accessPass.create({
      data: {
        routeId,
        token,
        language,
        expiresAt,
        status: AccessPassStatus.ACTIVE,
      },
    });
  }
}
