import { Module } from '@nestjs/common';
import { PoiModule } from '../poi/poi.module.js';
import { GeoController } from './geo.controller.js';
import { GeoRepository } from './geo.repository.js';
import { GeoService } from './geo.service.js';

@Module({
  imports: [PoiModule],
  controllers: [GeoController],
  providers: [GeoService, GeoRepository],
  exports: [GeoService, GeoRepository],
})
export class GeoModule {}
