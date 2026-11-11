/**
 * Module Quản lý Lượt Truy cập (Access Event Service)
 * Dự án: Thuyết minh tự động Thành phố Hồ Chí Minh (GeoAudio Guide Sài Gòn)
 * 
 * Trách nhiệm:
 * - Tiếp nhận và ghi nhận các sự kiện du khách truy cập trang web qua QR Code, Tour hoặc Trực tiếp.
 * - Nhận diện loại thiết bị (Mobile vs Desktop) qua User-Agent để tối ưu giao diện.
 * - Cung cấp số liệu thống kê tổng hợp (Tổng lượt truy cập, lượt hôm nay, xu hướng 7 ngày, phân bổ nguồn).
 */

import { Injectable } from '@nestjs/common';
import { AccessEventRepository } from './access-event.repository.js';
import { RecordAccessEventDto } from './dto.js';

@Injectable()
export class AccessEventService {
  constructor(private readonly repository: AccessEventRepository) {}

  /**
   * Ghi nhận một sự kiện du khách truy cập trang web.
   * @param dto Dữ liệu truy cập (visitorId, language, poiId, source, path...)
   * @param ipAddress Địa chỉ IP của client (được lấy từ HTTP Request Headers)
   * @param userAgent Chuỗi User-Agent của trình duyệt để phân loại thiết bị
   */
  async record(dto: RecordAccessEventDto, ipAddress?: string, userAgent?: string) {
    // Tự động suy luận loại thiết bị nếu client không gửi rõ
    const detectedDevice = dto.deviceType || (userAgent && /Mobi|Android|iPhone/i.test(userAgent) ? 'Mobile' : 'Desktop');

    const event = await this.repository.create({
      visitorId: dto.visitorId,
      language: dto.language,
      poiId: dto.poiId,
      source: dto.source,
      deviceType: detectedDevice,
      path: dto.path,
      ipAddress,
      userAgent,
    });

    return {
      ok: true,
      id: event.id,
      visitorId: event.visitorId,
      createdAt: event.createdAt,
    };
  }

  /**
   * Thống kê tổng hợp số liệu truy cập phục vụ Admin Dashboard:
   * - Tổng lượt truy cập tích lũy
   * - Số lượt truy cập trong ngày hôm nay
   * - Chuỗi dữ liệu xu hướng theo ngày (mặc định 7 ngày gần nhất)
   * - Phân bổ theo Nguồn (QR/TOUR/DIRECT), Ngôn ngữ, Thiết bị và Top POI
   */
  async getStats(days = 7) {
    const [totalVisits, todayVisits, visitsByDate, breakdowns, recent] = await Promise.all([
      this.repository.countTotal(),
      this.repository.countToday(),
      this.repository.getVisitsByDate(days),
      this.repository.getBreakdowns(),
      this.repository.getRecent(30),
    ]);

    return {
      totalVisits,
      todayVisits,
      visitsByDate,
      ...breakdowns,
      recentVisits: recent,
    };
  }

  /**
   * Lấy danh sách các lượt truy cập gần đây nhất
   */
  async getRecent(take = 50) {
    return this.repository.getRecent(take);
  }
}
