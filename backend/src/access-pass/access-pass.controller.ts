/**
 * ==============================================================================
 * MODULE: ACCESS PASS (MÃ VÉ THAM QUAN QR)
 * TẦNG: PRESENTATION LAYER (GIAO TIẾP HTTP)
 * ==============================================================================
 * Vai trò:
 * - Kích hoạt vé tham quan (POST /api/access-passes/activate).
 * - Xác thực tính hợp lệ của mã vé (GET /api/access-passes/validate/:code).
 * ==============================================================================
 */

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
