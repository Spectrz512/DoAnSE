/**
 * Module Dịch Vụ Theo Dõi Phiên Nghe Thuyết Minh (Listening Service)
 * Dự án: Thuyết minh tự động Thành phố Hồ Chí Minh (GeoAudio Guide Sài Gòn)
 * 
 * Trách nhiệm:
 * - Tiếp nhận và ghi nhận các sự kiện nghe thuyết minh tự động (GPS) hoặc thủ công.
 * - Quản lý vòng đời phiên nghe trực tiếp: Chuẩn bị (PREPARING) -> Đang nghe (PLAYING) -> Hoàn thành (COMPLETED) / Lỗi (ERROR).
 * - Chống ghi nhận trùng lặp sự kiện nghe (Throttle 4 giây).
 * - Cung cấp công cụ mô phỏng tải / nhân đôi sự kiện nghe thử nghiệm trong môi trường Dev/Staging với giới hạn an toàn.
 * - Quản lý tín hiệu hiện diện (Presence Heartbeat) và phát hiện số người nghe đồng thời thực tế.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateListeningEventDto,
  EndListeningSessionDto,
  SimulateDoubleEventsDto,
  StartListeningSessionDto,
  UpdateListeningSessionDto,
  VisitorHeartbeatDto,
  VisitorLeaveDto,
} from './dto.js';
import { ListeningRepository } from './listening.repository.js';

@Injectable()
export class ListeningService {
  constructor(private readonly repository: ListeningRepository) {}

  /**
   * Ghi nhận một sự kiện nghe mới với kiểm tra tồn tại của POI và cơ chế chống trùng lặp.
   */
  async create(dto: CreateListeningEventDto) {
    const poi = await this.repository.findPoiById(dto.poiId);
    if (!poi) {
      throw new NotFoundException(`POI with ID [${dto.poiId}] not found`);
    }

    return this.repository.create({
      poiId: dto.poiId,
      language: dto.language,
      mode: dto.mode,
      status: dto.status,
      durationSeconds: dto.durationSeconds,
      errorMessage: dto.errorMessage,
      latitude: dto.latitude,
      longitude: dto.longitude,
      visitorId: dto.visitorId,
    });
  }

  /**
   * Khởi tạo hoặc cập nhật trạng thái bắt đầu phiên nghe trực tiếp (PLAYING hoặc PREPARING).
   */
  async startSession(dto: StartListeningSessionDto) {
    const poi = await this.repository.findPoiById(dto.poiId);
    if (!poi) {
      throw new NotFoundException(`POI with ID [${dto.poiId}] not found`);
    }
    return this.repository.startSession(dto);
  }

  /**
   * Cập nhật nhịp tim hoặc tiến độ nghe của phiên đang diễn ra.
   */
  async updateSession(dto: UpdateListeningSessionDto) {
    return this.repository.updateSession(dto);
  }

  /**
   * Đánh dấu kết thúc phiên nghe (COMPLETED hoặc ERROR).
   */
  async endSession(dto: EndListeningSessionDto) {
    return this.repository.endSession(dto);
  }

  /**
   * Công cụ mô phỏng tải / nhân đôi sự kiện nghe phục vụ kiểm thử hiệu năng môi trường phát triển (Dev).
   * Giới hạn an toàn tối đa để không làm ảnh hưởng tính toàn vẹn hệ thống.
   */
  async simulateDouble(dto: SimulateDoubleEventsDto) {
    return this.repository.simulateDoubleEvents(dto.limit ?? 20);
  }

  /**
   * Truy vấn lịch sử các lượt nghe của du khách.
   */
  history(visitorId?: string) {
    return this.repository.findHistory(visitorId);
  }

  /**
   * Cập nhật tín hiệu hiện diện (Heartbeat) định kỳ của du khách đang trực tuyến.
   */
  heartbeat(dto: VisitorHeartbeatDto) {
    return this.repository.upsertHeartbeat({
      visitorId: dto.visitorId,
      passCode: dto.passCode,
      language: dto.language,
      currentPoiId: dto.currentPoiId,
      deviceInfo: dto.deviceInfo,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isSpeaking: dto.isSpeaking,
    });
  }

  /**
   * Ghi nhận sự kiện du khách rời trang hoặc đóng tab trình duyệt.
   */
  async leave(dto: VisitorLeaveDto) {
    await this.repository.markLeave(dto.visitorId);
    return { ok: true, visitorId: dto.visitorId, leftAt: new Date() };
  }

  /**
   * Lấy danh sách du khách đang trực tuyến trong cửa sổ thời gian (mặc định 60s).
   */
  getActiveVisitors(withinSeconds = 60) {
    return this.repository.getActiveSessions(withinSeconds);
  }

  /**
   * Lấy danh sách các phiên nghe trực tiếp đang hoạt động (PLAYING hoặc PREPARING).
   */
  getActiveListeningSessions(withinSeconds = 45) {
    return this.repository.getActiveListeningSessions(withinSeconds);
  }
}