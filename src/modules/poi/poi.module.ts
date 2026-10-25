import { Module } from "@nestjs/common";
import { PoiController } from "./poi.controller";
import { PoiRepository } from "./poi.repository";
import { PoiService } from "./poi.service";
@Module({
  controllers: [PoiController],
  providers: [PoiService, PoiRepository],
})
export class PoiModule {}
