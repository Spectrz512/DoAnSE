import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Language, PoiStatus } from '@prisma/client';

export class UpsertNarrationDto {
  @IsEnum(Language)
  language!: Language;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(10)
  content!: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}

export class UpdatePoiStatusDto {
  @IsEnum(PoiStatus)
  status!: PoiStatus;
}