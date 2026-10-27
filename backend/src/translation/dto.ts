import { IsIn, IsString, MinLength } from 'class-validator';
export class TranslateDto {
  @IsString() @MinLength(1) text!: string;
  @IsIn(['vi', 'en']) source!: 'vi' | 'en';
  @IsIn(['vi', 'en']) target!: 'vi' | 'en';
}
