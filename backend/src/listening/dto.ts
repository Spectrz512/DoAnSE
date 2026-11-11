import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Language, ListeningMode, ListeningStatus } from '@prisma/client';

export class CreateListeningEventDto {
  @IsString()
  poiId!: string;

  @IsEnum(Language)
  language!: Language;

  @IsEnum(ListeningMode)
  mode!: ListeningMode;

  @IsOptional()
  @IsEnum(ListeningStatus)
  status?: ListeningStatus;

  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  errorMessage?: string;

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

export class StartListeningSessionDto {
  @IsString()
  visitorId!: string;

  @IsString()
  poiId!: string;

  @IsEnum(Language)
  language!: Language;

  @IsOptional()
  @IsEnum(ListeningMode)
  mode?: ListeningMode;

  @IsOptional()
  @IsEnum(ListeningStatus)
  status?: ListeningStatus; // PREPARING | PLAYING
}

export class UpdateListeningSessionDto {
  @IsString()
  visitorId!: string;

  @IsString()
  poiId!: string;

  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @IsOptional()
  @IsEnum(ListeningStatus)
  status?: ListeningStatus;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class EndListeningSessionDto {
  @IsString()
  visitorId!: string;

  @IsString()
  poiId!: string;

  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @IsOptional()
  @IsEnum(ListeningStatus)
  status?: ListeningStatus; // COMPLETED | ERROR

  @IsOptional()
  @IsString()
  errorMessage?: string;
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

export class SimulateDoubleEventsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}