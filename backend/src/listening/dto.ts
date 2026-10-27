import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Language, ListeningMode } from '@prisma/client';

export class CreateListeningEventDto {
  @IsString()
  poiId!: string;

  @IsEnum(Language)
  language!: Language;

  @IsEnum(ListeningMode)
  mode!: ListeningMode;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  visitorId?: string;
}

export class VisitorHeartbeatDto {
  @IsString()
  visitorId!: string;

  @IsOptional()
  @IsString()
  passCode?: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsString()
  currentPoiId?: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isSpeaking?: boolean;
}

export class VisitorLeaveDto {
  @IsString()
  visitorId!: string;
}