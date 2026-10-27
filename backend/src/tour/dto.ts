import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Language } from '@prisma/client';

export class PlanTourDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  poiIds!: string[];

  @IsOptional()
  @IsEnum(Language)
  language?: Language = Language.vi;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(15)
  walkingSpeedKmh?: number = 4;
}

export class TourQueryDto {
  @IsOptional()
  @IsEnum(Language)
  language?: Language = Language.vi;
}

export class CustomRouteDto extends PlanTourDto {}