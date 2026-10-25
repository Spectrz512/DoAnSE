import { Transform, Type } from "class-transformer";
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
export class NearbyPoiDto {
  @Type(() => Number) @IsLatitude() latitude!: number;
  @Type(() => Number) @IsLongitude() longitude!: number;
  @Type(() => Number) @Min(1) @Max(5000) @IsOptional() radiusM = 250;
  @Transform(({ value }) => String(value).toLowerCase())
  @IsString()
  @IsOptional()
  language = "vi";
}
