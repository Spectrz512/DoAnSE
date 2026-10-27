import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Language, PassStatus } from '@prisma/client';

export class ActivateAccessPassDto {
  @IsString()
  @MinLength(4)
  code!: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language = Language.vi;

  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class CreateAccessPassDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  tourId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number = 24;
}

export class AccessPassStatusDto {
  code!: string;
  status!: PassStatus;
  isValid!: boolean;
  expiresAt!: Date | null;
  tourId?: string | null;
}
