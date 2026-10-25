import { Transform } from "class-transformer";
import { IsOptional, IsString, Length } from "class-validator";

export class ActivatePassDto {
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @IsString()
  @Length(4, 100)
  qrCode!: string;

  @Transform(({ value }) => String(value).toLowerCase())
  @IsOptional()
  @IsString()
  language = "vi";
}
