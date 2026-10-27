import { Module } from '@nestjs/common';
import { TourController } from './tour.controller.js';
import { TourRepository } from './tour.repository.js';
import { TourService } from './tour.service.js';

@Module({
  controllers: [TourController],
  providers: [TourRepository, TourService],
  exports: [TourRepository, TourService],
})
export class TourModule {}