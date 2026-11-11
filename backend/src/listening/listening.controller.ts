import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  CreateListeningEventDto,
  EndListeningSessionDto,
  SimulateDoubleEventsDto,
  StartListeningSessionDto,
  UpdateListeningSessionDto,
  VisitorHeartbeatDto,
  VisitorLeaveDto,
} from './dto.js';
import { ListeningService } from './listening.service.js';

@Controller('listening-events')
export class ListeningController {
  constructor(private readonly listening: ListeningService) {}

  /**
   * Ghi nhận 1 lượt nghe thuyết minh (kèm chống gửi lặp 4 giây)
   * POST /api/listening-events
   */
  @Post()
  create(@Body() dto: CreateListeningEventDto) {
    return this.listening.create(dto);
  }

  /**
   * Bắt đầu một phiên nghe trực tiếp (PREPARING hoặc PLAYING)
   * POST /api/listening-events/session/start
   */
  @Post('session/start')
  startSession(@Body() dto: StartListeningSessionDto) {
    return this.listening.startSession(dto);
  }

  /**
   * Cập nhật tiến trình thời lượng phiên nghe
   * POST /api/listening-events/session/progress
   */
  @Post('session/progress')
  updateSession(@Body() dto: UpdateListeningSessionDto) {
    return this.listening.updateSession(dto);
  }

  /**
   * Kết thúc phiên nghe (COMPLETED hoặc ERROR)
   * POST /api/listening-events/session/end
   */
  @Post('session/end')
  endSession(@Body() dto: EndListeningSessionDto) {
    return this.listening.endSession(dto);
  }

  /**
   * Nhân đôi dữ liệu lượt nghe (chỉ phục vụ kiểm thử tải & mô phỏng môi trường Dev)
   * POST /api/listening-events/simulate-double
   */
  @Post('simulate-double')
  simulateDouble(@Body() dto: SimulateDoubleEventsDto) {
    return this.listening.simulateDouble(dto);
  }

  /**
   * Lịch sử nghe thuyết minh
   * GET /api/listening-events?visitorId=...
   */
  @Get()
  history(@Query('visitorId') visitorId: string) {
    return this.listening.history(visitorId);
  }

  /**
   * Gửi nhịp tim vị trí và trạng thái du khách
   * POST /api/listening-events/heartbeat
   */
  @Post('heartbeat')
  heartbeat(@Body() dto: VisitorHeartbeatDto) {
    return this.listening.heartbeat(dto);
  }

  /**
   * Rời khỏi trang web / ngắt phiên
   * POST /api/listening-events/leave
   */
  @Post('leave')
  leave(@Body() dto: VisitorLeaveDto) {
    return this.listening.leave(dto);
  }

  /**
   * Danh sách người dùng trực tuyến
   * GET /api/listening-events/active
   */
  @Get('active')
  getActive() {
    return this.listening.getActiveVisitors();
  }

  /**
   * Danh sách các phiên đang nghe trực tiếp
   * GET /api/listening-events/active-sessions
   */
  @Get('active-sessions')
  getActiveSessions() {
    return this.listening.getActiveListeningSessions();
  }
}
