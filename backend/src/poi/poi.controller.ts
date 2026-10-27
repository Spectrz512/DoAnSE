import { Controller, Get, Param, Query } from '@nestjs/common';
import { NearbyPoiQueryDto } from './dto.js';
import { PoiService } from './poi.service.js';

@Controller('pois')
export class PoiController {
  constructor(private readonly service: PoiService) {}

  @Get('bootstrap')
  bootstrap() { return this.service.bootstrap(); }

  // 'nearby' phải đứng trước ':id' để NestJS không nhầm 'nearby' là param id
  @Get('nearby')
  findNearby(@Query() query: NearbyPoiQueryDto) {
    return this.service.findNearbyWithTriggerState(query);
  }

  @Get()
  list(@Query('q') query?: string, @Query('category') category?: string) {
    return this.service.list(query, category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }
}
