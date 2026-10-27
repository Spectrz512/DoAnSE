import { describe, expect, it, vi } from 'vitest';
import { Language, PoiStatus } from '@prisma/client';
import { AdminService } from '../src/admin/admin.service.js';
import type { AdminRepository } from '../src/admin/admin.repository.js';
import type { PoiRepository } from '../src/poi/poi.repository.js';

describe('AdminService (UC3 & UC7 - Multilingual POI Management & Audit Events)', () => {
  const findPoiMock = vi.fn().mockImplementation((id: string) => {
    if (id === 'poi-1') return Promise.resolve({ id: 'poi-1', name: 'Chùa Linh Ứng' });
    return Promise.resolve(null);
  });

  const getStatsMock = vi.fn().mockResolvedValue({
    totalPois: 8,
    publishedPois: 7,
    draftPois: 1,
    totalNarrations: 40,
    totalTours: 2,
    totalListeningEvents: 25,
    byMode: { AUTO: 20, MANUAL: 5 },
    byLanguage: { vi: 15, en: 5, ko: 2, ja: 2, zh: 1 },
    topPois: [{ poiId: 'poi-1', name: 'Chùa Linh Ứng', count: 12 }],
    recentEvents: [],
    recentAudits: [],
  });

  const createPoiMock = vi.fn().mockImplementation((dto) =>
    Promise.resolve({
      id: 'poi-new',
      ...dto,
      status: dto.status ?? PoiStatus.PUBLISHED,
    }),
  );

  const updatePoiMock = vi.fn().mockImplementation((id: string, dto) =>
    Promise.resolve({ id, ...dto }),
  );

  const updatePoiStatusMock = vi.fn().mockImplementation((id: string, status: PoiStatus) =>
    Promise.resolve({ id, status }),
  );

  const deletePoiMock = vi.fn().mockImplementation((id: string) =>
    Promise.resolve({ id, name: 'Chùa Linh Ứng' }),
  );

  const upsertNarrationMock = vi.fn().mockImplementation((poiId: string, dto) =>
    Promise.resolve({ id: 'nar-1', poiId, ...dto }),
  );

  const listAuditEventsMock = vi.fn().mockResolvedValue([
    {
      id: 'audit-1',
      action: 'PUBLISH_POI',
      entityType: 'POI',
      entityId: 'poi-1',
    },
  ]);

  const mockPoiRepo = {
    find: findPoiMock,
  } as unknown as PoiRepository;

  const mockAdminRepo = {
    getStats: getStatsMock,
    createPoi: createPoiMock,
    updatePoi: updatePoiMock,
    updatePoiStatus: updatePoiStatusMock,
    deletePoi: deletePoiMock,
    upsertNarration: upsertNarrationMock,
    listAuditEvents: listAuditEventsMock,
  } as unknown as AdminRepository;

  const service = new AdminService(mockAdminRepo, mockPoiRepo);

  it('lấy thống kê tổng quan hệ thống qua getStats()', async () => {
    const stats = await service.getStats();
    expect(stats.totalPois).toBe(8);
    expect(stats.publishedPois).toBe(7);
    expect(stats.byMode.AUTO).toBe(20);
    expect(getStatsMock).toHaveBeenCalled();
  });

  it('lấy danh sách nhật ký kiểm toán qua getAuditEvents()', async () => {
    const audits = await service.getAuditEvents();
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe('PUBLISH_POI');
    expect(listAuditEventsMock).toHaveBeenCalled();
  });

  it('tạo POI ở trạng thái DRAFT trước khi publish', async () => {
    const poi = await service.createPoi({
      name: 'Vườn Lộc Uyển',
      description: 'Khu vườn tượng Phật',
      latitude: 16.101,
      longitude: 108.276,
      category: 'Tâm linh',
      status: PoiStatus.DRAFT,
    });

    expect(poi.id).toBe('poi-new');
    expect(poi.status).toBe(PoiStatus.DRAFT);
  });

  it('cập nhật thông tin chi tiết của POI qua updatePoi()', async () => {
    const updated = await service.updatePoi('poi-1', {
      name: 'Chùa Linh Ứng Bãi Bụt',
      priority: 10,
    });

    expect(updated.id).toBe('poi-1');
    expect(updated.name).toBe('Chùa Linh Ứng Bãi Bụt');
    expect(updatePoiMock).toHaveBeenCalledWith('poi-1', {
      name: 'Chùa Linh Ứng Bãi Bụt',
      priority: 10,
    });
  });

  it('chuyển trạng thái POI từ DRAFT sang PUBLISHED và ghi nhận audit', async () => {
    const updated = await service.updatePoiStatus('poi-1', PoiStatus.PUBLISHED);
    expect(updated.status).toBe(PoiStatus.PUBLISHED);
    expect(updatePoiStatusMock).toHaveBeenCalledWith('poi-1', PoiStatus.PUBLISHED);
  });

  it('xóa POI hợp lệ qua deletePoi()', async () => {
    const deleted = await service.deletePoi('poi-1');
    expect(deleted.id).toBe('poi-1');
    expect(deletePoiMock).toHaveBeenCalledWith('poi-1');
  });

  it('cập nhật bản dịch thuyết minh tiếng Trung (zh) cho POI', async () => {
    const narration = await service.upsertNarration('poi-1', {
      language: Language.zh,
      title: '灵应寺',
      content: '山茶半岛著名的佛教寺庙。',
      durationSeconds: 150,
    });

    expect(narration.language).toBe(Language.zh);
    expect(narration.title).toBe('灵应寺');
  });

  it('báo lỗi NotFoundException khi chỉnh sửa trạng thái của POI không tồn tại', async () => {
    await expect(service.updatePoiStatus('invalid-id', PoiStatus.PUBLISHED)).rejects.toThrowError(
      'POI not found',
    );
  });

  it('báo lỗi NotFoundException khi cập nhật POI không tồn tại', async () => {
    await expect(
      service.updatePoi('invalid-id', { name: 'New Name' }),
    ).rejects.toThrowError('POI not found');
  });

  it('báo lỗi NotFoundException khi xóa POI không tồn tại', async () => {
    await expect(service.deletePoi('invalid-id')).rejects.toThrowError('POI not found');
  });

  it('báo lỗi NotFoundException khi cập nhật narration cho POI không tồn tại', async () => {
    await expect(
      service.upsertNarration('invalid-id', {
        language: Language.en,
        title: 'Title',
        content: 'Content test 12345',
      }),
    ).rejects.toThrowError('POI not found');
  });
});
