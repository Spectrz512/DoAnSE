import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
class TranslationDto {
  @IsString() language!: string;
  @IsString() title!: string;
  @IsString() description!: string;
}
export class CreatePoiDto {
  @IsString() slug!: string;
  @Type(() => Number) @IsLatitude() latitude!: number;
  @Type(() => Number) @IsLongitude() longitude!: number;
  @Type(() => Number) @IsInt() @Min(5) @Max(500) triggerRadiusM = 35;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations!: TranslationDto[];
}
