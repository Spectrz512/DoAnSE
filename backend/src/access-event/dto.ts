import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccessSource, Language } from '@prisma/client';

export class RecordAccessEventDto {
  @IsString()
  visitorId!: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsString()
  poiId?: string;

  @IsOptional()
  @IsEnum(AccessSource)
  source?: AccessSource;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  path?: string;
}
