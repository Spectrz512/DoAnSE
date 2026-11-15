import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Language } from '@prisma/client';

export class ChatDto {
  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}