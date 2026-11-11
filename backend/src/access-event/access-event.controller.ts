import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AccessEventService } from './access-event.service.js';
import { RecordAccessEventDto } from './dto.js';

@Controller('access-events')
export class AccessEventController {
  constructor(private readonly service: AccessEventService) {}

  /**
   * Ghi nhận 1 lượt truy cập (page load, scan QR, direct open)
   * POST /api/access-events
   */
  @Post()
  record(@Body() dto: RecordAccessEventDto, @Req() req: Request) {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const ipAddress = rawIp.split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';

    return this.service.record(dto, ipAddress, userAgent);
  }

  /**
   * Thống kê lượt truy cập cho Dashboard Admin
   * GET /api/access-events/stats?days=7
   */
  @Get('stats')
  getStats(@Query('days') days?: string) {
    const d = days ? Math.max(1, Math.min(30, parseInt(days, 10))) : 7;
    return this.service.getStats(d);
  }

  /**
   * Lịch sử các lượt truy cập gần nhất
   * GET /api/access-events/recent?take=50
   */
  @Get('recent')
  getRecent(@Query('take') take?: string) {
    const t = take ? Math.max(1, Math.min(100, parseInt(take, 10))) : 50;
    return this.service.getRecent(t);
  }
}
