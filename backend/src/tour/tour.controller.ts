import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CustomRouteDto, PlanTourDto, TourQueryDto } from './dto.js';
import { TourService } from './tour.service.js';

@Controller('tours')
export class TourController {
  constructor(private readonly tours: TourService) {}

  @Get()
  getAll(@Query() query: TourQueryDto) {
    return this.tours.getTours(query);
  }

  @Get('suggested')
  suggested(@Query() query: TourQueryDto) {
    return this.tours.suggested(query.language);
  }

  @Post('plan')
  plan(@Body() dto: PlanTourDto) {
    return this.tours.plan(dto.poiIds, dto.language, dto.walkingSpeedKmh);
  }

  @Post('custom-route')
  customRoute(@Body() dto: CustomRouteDto) {
    return this.tours.createCustomRoute(dto);
  }

  /**
   * UC8: Tải trọn gói dữ liệu Tour ngoại tuyến (Offline Package)
   * GET /api/tours/:id/package?language=vi
   */
  @Get(':id/package')
  getPackage(@Param('id') id: string, @Query() query: TourQueryDto) {
    return this.tours.getPackage(id, query.language);
  }

  @Get(':id')
  detail(@Param('id') id: string, @Query() query: TourQueryDto) {
    return this.tours.detail(id, query.language);
  }
}
