import { describe, expect, it, vi } from 'vitest';
import { Language } from '@prisma/client';
import { TourService } from '../src/tour/tour.service.js';

describe('TourService (UC6 - Route & Time Estimation)', () => {
  const mockPois = [
    {
      id: 'poi-1',
      name: 'Cổng Tam Quan',
      latitude: 16.1001,
      longitude: 108.2751,
      imageUrl: null,
      narrations: [{ durationSeconds: 180, title: 'Giới thiệu cổng' }],
    },
    {
      id: 'poi-2',
      name: 'Tượng Phật Bà Quan Âm',
      latitude: 16.102,
      longitude: 108.277,
      imageUrl: null,
      narrations: [{ durationSeconds: 240, title: 'Tượng Phật Bà' }],
    },
  ];

  const mockTour = {
    id: 'tour-1',
    name: 'Tour Tâm Linh',
    description: 'Khám phá các điểm tâm linh tiêu biểu',
    isSuggested: true,
    estimatedMinutes: 30,
    stops: [
      { id: 's1', position: 1, poi: mockPois[0] },
      { id: 's2', position: 2, poi: mockPois[1] },
    ],
  };

  const mockRepository = {
    findSuggested: vi.fn().mockResolvedValue([mockTour]),
    findAll: vi.fn().mockResolvedValue([mockTour]),
    findById: vi.fn().mockImplementation((id: string) => {
      if (id === 'tour-1') return Promise.resolve(mockTour);
      return Promise.resolve(null);
    }),
    findPoisByIds: vi.fn().mockResolvedValue(mockPois),
  };

  const service = new TourService(mockRepository as any);

  it('lấy danh sách tour gợi ý và tính toán khoảng cách + thời lượng động', async () => {
    const result = await service.suggested(Language.vi);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tour Tâm Linh');
    expect(result[0].totalStops).toBe(2);
    expect(result[0].totalDistanceM).toBeGreaterThan(0);
    expect(result[0].calculatedDurationMin).toBeGreaterThan(0);
  });

  it('báo lỗi NotFoundException khi truy vấn tour không tồn tại', async () => {
    await expect(service.detail('invalid-id')).rejects.toThrowError('Tour not found');
  });

  it('lập lộ trình cá nhân (plan / custom-route) với thời gian nghe và đi bộ thực tế', async () => {
    const result = await service.plan(['poi-1', 'poi-2'], Language.vi, 4);

    expect(result.totalStops).toBe(2);
    expect(result.totalAudioDurationSec).toBe(420); // 180s + 240s
    expect(result.totalDistanceM).toBeGreaterThan(0);
    expect(result.estimatedMinutes).toBeGreaterThanOrEqual(7);
    expect(result.stops[0].legDistanceM).toBe(0);
    expect(result.stops[1].legDistanceM).toBeGreaterThan(0);
  });
});