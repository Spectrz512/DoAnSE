import { Language } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { NearbyPoiCandidate } from '../src/poi/poi.repository.js';
import { PoiRepository } from '../src/poi/poi.repository.js';
import { PoiService } from '../src/poi/poi.service.js';

/* ─────────────────────────────────────────────────────────────────
   Fixture dữ liệu: 3 POI tại khu vực Dinh Độc Lập – Sài Gòn
   ───────────────────────────────────────────────────────────────── */
const POI_DINH_DOC_LAP: NearbyPoiCandidate = {
  id: 'dinh-doc-lap',
  name: 'Dinh Độc Lập',
  description: 'Di tích lịch sử quốc gia',
  latitude: 10.7769,
  longitude: 106.6952,
  category: 'heritage',
  address: '135 Nam Kỳ Khởi Nghĩa, Q.1',
  activationRadius: 80,
  priority: 10,
  imageUrl: null,
  distanceM: 40,       // Người dùng đang đứng 40m – bên trong triggerRadius 80m
  triggerRadiusM: 80,
  resetRadiusM: 120,   // 80 * 1.5
  narration: {
    id: 'n-1',
    language: Language.vi,
    title: 'Dinh Độc Lập',
    content: 'Xây dựng năm 1966…',
    audioUrl: null,
    durationSeconds: 240,
  },
};

const POI_NHA_THO: NearbyPoiCandidate = {
  id: 'nha-tho-duc-ba',
  name: 'Nhà thờ Đức Bà Sài Gòn',
  description: 'Công trình kiến trúc Pháp',
  latitude: 10.7797,
  longitude: 106.6990,
  category: 'heritage',
  address: '1 Công Xã Paris, Q.1',
  activationRadius: 60,
  priority: 9,
  imageUrl: null,
  distanceM: 350,      // Người dùng đứng 350m – ngoài triggerRadius 60m
  triggerRadiusM: 60,
  resetRadiusM: 90,
  narration: null,
};

const POI_BUU_DIEN: NearbyPoiCandidate = {
  id: 'buu-dien-tp',
  name: 'Bưu điện Trung tâm Sài Gòn',
  description: 'Bưu điện lớn nhất Việt Nam',
  latitude: 10.7798,
  longitude: 106.6998,
  category: 'heritage',
  address: '2 Công Xã Paris, Q.1',
  activationRadius: 50,
  priority: 8,
  imageUrl: null,
  distanceM: 130,      // Người dùng đứng 130m – vừa rời khỏi resetRadius (50*1.5=75) → ngoài reset
  triggerRadiusM: 50,
  resetRadiusM: 75,
  narration: {
    id: 'n-2',
    language: Language.vi,
    title: 'Bưu điện Trung tâm',
    content: 'Hoàn thành năm 1891…',
    audioUrl: null,
    durationSeconds: 180,
  },
};

/* ─────────────────────────────────────────────────────────────────
   Helper tạo PoiService với mock repository
   ───────────────────────────────────────────────────────────────── */
function buildService(findNearbyResult: NearbyPoiCandidate[]) {
  const mockRepo = {
    bootstrap: vi.fn(),
    list: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    findNearby: vi.fn().mockResolvedValue(findNearbyResult),
  } as unknown as PoiRepository;
  return new PoiService(mockRepo);
}

/* ─────────────────────────────────────────────────────────────────
   UC2 – Test Suite: GET /pois/nearby – Geofence & Anti-replay
   ───────────────────────────────────────────────────────────────── */
describe('PoiService.findNearbyWithTriggerState — UC2 Geofence & Chống phát lặp', () => {

  it('KH1: Trả về đúng POI trong radiusM và tính đúng khoảng cách Haversine', async () => {
    // Giả lập findNearby trả về 2 POI trong vùng 500m
    const service = buildService([POI_DINH_DOC_LAP, POI_NHA_THO]);

    const result = await service.findNearbyWithTriggerState({
      lat: 10.7769,
      lng: 106.6952,
      radiusM: 500,
      language: Language.vi,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('dinh-doc-lap');
    expect(result.items[0].distanceM).toBe(40);
    expect(result.userLocation).toEqual({ lat: 10.7769, lng: 106.6952 });
  });

  it('KH2: shouldTrigger = true khi du khách vào trong triggerRadiusM và POI chưa trong playedPoiIds', async () => {
    const service = buildService([POI_DINH_DOC_LAP]);

    const result = await service.findNearbyWithTriggerState({
      lat: 10.7769,
      lng: 106.6952,
      radiusM: 500,
      language: Language.vi,
      playedPoiIds: '', // Chưa phát POI nào
    });

    const dinh = result.items.find((p) => p.id === 'dinh-doc-lap')!;
    expect(dinh).toBeDefined();
    expect(dinh.withinTrigger).toBe(true);
    expect(dinh.isPlayed).toBe(false);
    expect(dinh.shouldTrigger).toBe(true);
    expect(result.nextTriggerPoi?.id).toBe('dinh-doc-lap');
  });

  it('KH3: shouldTrigger = false (chống phát lặp) khi POI đã có trong playedPoiIds dù vẫn trong trigger', async () => {
    const service = buildService([POI_DINH_DOC_LAP]);

    const result = await service.findNearbyWithTriggerState({
      lat: 10.7769,
      lng: 106.6952,
      radiusM: 500,
      language: Language.vi,
      playedPoiIds: 'dinh-doc-lap', // Đã phát trước đó
    });

    const dinh = result.items.find((p) => p.id === 'dinh-doc-lap')!;
    expect(dinh.withinTrigger).toBe(true);
    expect(dinh.isPlayed).toBe(true);
    expect(dinh.shouldTrigger).toBe(false);   // Không trigger lại
    expect(result.nextTriggerPoi).toBeNull();  // Không có POI nào cần trigger
  });

  it('KH4: Đưa POI vào resetPoiIds và cho phép phát lại khi du khách đi xa >= 1.5 × triggerRadiusM', async () => {
    // POI_BUU_DIEN: distanceM=130 > resetRadiusM=75 → người dùng đã rời bán kính reset
    // POI_DINH_DOC_LAP: distanceM=40 < resetRadiusM=120 → vẫn trong vùng reset, không được reset
    const service = buildService([POI_DINH_DOC_LAP, POI_BUU_DIEN]);

    const result = await service.findNearbyWithTriggerState({
      lat: 10.7769,
      lng: 106.6952,
      radiusM: 500,
      language: Language.vi,
      playedPoiIds: 'dinh-doc-lap,buu-dien-tp', // Cả 2 đã được phát
    });

    // buu-dien-tp: distanceM(130) >= resetRadiusM(75) → phải nằm trong resetPoiIds
    expect(result.resetPoiIds).toContain('buu-dien-tp');

    // dinh-doc-lap: distanceM(40) < resetRadiusM(120) → KHÔNG được reset
    expect(result.resetPoiIds).not.toContain('dinh-doc-lap');

    // buu-dien-tp sau khi reset: đã bị xóa khỏi playedSet → activePlayedPoiIds chỉ còn dinh-doc-lap
    expect(result.activePlayedPoiIds).toContain('dinh-doc-lap');
    expect(result.activePlayedPoiIds).not.toContain('buu-dien-tp');
  });
});
