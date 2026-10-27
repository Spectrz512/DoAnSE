import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateListeningEventDto, VisitorHeartbeatDto, VisitorLeaveDto } from './dto.js';
import { ListeningService } from './listening.service.js';

@Controller('listening-events')
export class ListeningController {
  constructor(private readonly listening: ListeningService) {}

  @Post()
  create(@Body() dto: CreateListeningEventDto) {
    return this.listening.create(dto);
  }

  @Get()
  history(@Query('visitorId') visitorId: string) {
    return this.listening.history(visitorId);
  }

  @Post('heartbeat')
  heartbeat(@Body() dto: VisitorHeartbeatDto) {
    return this.listening.heartbeat(dto);
  }

  @Post('leave')
  leave(@Body() dto: VisitorLeaveDto) {
    return this.listening.leave(dto);
  }

  @Get('active')
  getActive() {
    return this.listening.getActiveVisitors();
  }
}

