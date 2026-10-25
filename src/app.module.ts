import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccessPassModule } from "./modules/access-pass/access-pass.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { PoiModule } from "./modules/poi/poi.module";
import { PrismaModule } from "./shared/prisma/prisma.module";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccessPassModule,
    HealthModule,
    PoiModule,
  ],
})
export class AppModule {}
