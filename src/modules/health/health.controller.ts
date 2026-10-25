import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../shared/prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException("Database is unavailable");
    }
  }
}
