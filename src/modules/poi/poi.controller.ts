import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreatePoiDto } from "./dto/create-poi.dto";
import { NearbyPoiDto } from "./dto/nearby-poi.dto";
import { PoiService } from "./poi.service";
@ApiTags("pois")
@Controller("pois")
export class PoiController {
  constructor(private readonly service: PoiService) {}
  @Get("nearby") nearby(@Query() query: NearbyPoiDto) {
    return this.service.nearby(query);
  }
  @Post() @UseGuards(JwtAuthGuard) @ApiBearerAuth() create(
    @Body() dto: CreatePoiDto,
  ) {
    return this.service.create(dto);
  }
}
