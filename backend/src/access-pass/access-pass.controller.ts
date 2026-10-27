import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AccessPassService } from './access-pass.service.js';
import { ActivateAccessPassDto, CreateAccessPassDto } from './dto.js';

@Controller('access-passes')
export class AccessPassController {
  constructor(private readonly service: AccessPassService) {}

  @Post('activate')
  activate(@Body() dto: ActivateAccessPassDto) {
    return this.service.activate(dto);
  }

  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.service.validateCode(code);
  }

  @Post('create')
  create(@Body() dto: CreateAccessPassDto) {
    return this.service.create(dto);
  }
}
