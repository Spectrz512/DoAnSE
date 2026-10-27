import { describe, expect, it, vi } from 'vitest';
import { Language, ListeningMode } from '@prisma/client';
import { ListeningService } from '../src/listening/listening.service.js';
import type { ListeningRepository } from '../src/listening/listening.repository.js';

describe('ListeningService (UC5 & UC7 - Listening Events & Telemetry)', () => {
  const findPoiByIdMock = vi.fn().mockImplementation((id: string) => {
    if (id === 'poi-1') return Promise.resolve({ id: 'poi-1', name: 'Chùa Linh Ứng' });
    return Promise.resolve(null);
  });

  const createEventMock = vi.fn().mockImplementation((input) =>
    Promise.resolve({
      id: 'evt-1',
      ...input,
      createdAt: new Date(),
      poi: { id: input.poiId, name: 'Chùa Linh Ứng' },
    }),
  );

  const findHistoryMock = vi.fn().mockImplementation((visitorId?: string) =>
    Promise.resolve(
      visitorId
        ? [
            {
              id: 'evt-1',
              poiId: 'poi-1',
              language: Language.ja,
              mode: ListeningMode.MANUAL,
              latitude: 16.101,
              longitude: 108.276,
              visitorId,
              createdAt: new Date(),
              poi: { id: 'poi-1', name: 'Chùa Linh Ứng' },
            },
          ]
        : [
            {
              id: 'evt-1',
              poiId: 'poi-1',
              language: Language.ja,
              mode: ListeningMode.MANUAL,
              latitude: 16.101,
              longitude: 108.276,
              visitorId: 'visitor-123',
              createdAt: new Date(),
              poi: { id: 'poi-1', name: 'Chùa Linh Ứng' },
            },
            {
              id: 'evt-2',
              poiId: 'poi-1',
              language: Language.vi,
              mode: ListeningMode.AUTO,
              latitude: 16.101,
              longitude: 108.276,
              visitorId: 'visitor-456',
              createdAt: new Date(),
              poi: { id: 'poi-1', name: 'Chùa Linh Ứng' },
            },
          ],
    ),
  );


  const upsertHeartbeatMock = vi.fn().mockImplementation((input) =>
    Promise.resolve({
      ...input,
      connectedAt: new Date(),
      lastSeenAt: new Date(),
      isActive: true,
    }),
  );

  const markLeaveMock = vi.fn().mockImplementation((visitorId: string) =>
    Promise.resolve({
      visitorId,
      isActive: false,
      lastSeenAt: new Date(0),
    }),
  );

  const getActiveSessionsMock = vi.fn().mockImplementation(() =>
    Promise.resolve([
      {
        visitorId: 'vis-1',
        passCode: 'DEMO-2026',
        language: Language.vi,
        isActive: true,
        lastSeenAt: new Date(),
      },
    ]),
  );

  const mockRepository = {
    findPoiById: findPoiByIdMock,
    create: createEventMock,
    findHistory: findHistoryMock,
    upsertHeartbeat: upsertHeartbeatMock,
    markLeave: markLeaveMock,
    getActiveSessions: getActiveSessionsMock,
  } as unknown as ListeningRepository;

  const service = new ListeningService(mockRepository);

  it('ghi nhận sự kiện nghe thủ công (MANUAL) với ngôn ngữ tiếng Nhật (ja)', async () => {
    const event = await service.create({
      poiId: 'poi-1',
      language: Language.ja,
      mode: ListeningMode.MANUAL,
      visitorId: 'visitor-123',
    });

    expect(event.id).toBe('evt-1');
    expect(event.language).toBe(Language.ja);
    expect(event.mode).toBe(ListeningMode.MANUAL);
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        poiId: 'poi-1',
        language: Language.ja,
        mode: ListeningMode.MANUAL,
        visitorId: 'visitor-123',
      }),
    );
  });

  it('ghi nhận sự kiện nghe tự động (AUTO) kèm tọa độ GPS và visitorId', async () => {
    const event = await service.create({
      poiId: 'poi-1',
      language: Language.en,
      mode: ListeningMode.AUTO,
      latitude: 16.101,
      longitude: 108.276,
      visitorId: 'visitor-auto',
    });

    expect(event.id).toBe('evt-1');
    expect(event.language).toBe(Language.en);
    expect(event.mode).toBe(ListeningMode.AUTO);
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        poiId: 'poi-1',
        language: Language.en,
        mode: ListeningMode.AUTO,
        latitude: 16.101,
        longitude: 108.276,
        visitorId: 'visitor-auto',
      }),
    );
  });

  it('báo lỗi NotFoundException khi ghi nhận sự kiện cho POI không tồn tại', async () => {
    await expect(
      service.create({
        poiId: 'invalid-poi',
        language: Language.vi,
        mode: ListeningMode.AUTO,
      }),
    ).rejects.toThrowError('POI with ID [invalid-poi] not found');
  });

  it('trả về lịch sử lượt nghe của một du khách cụ thể qua visitorId', async () => {
    const history = await service.history('visitor-123');
    expect(history).toHaveLength(1);
    expect(history[0].visitorId).toBe('visitor-123');
    expect(findHistoryMock).toHaveBeenCalledWith('visitor-123');
  });

  it('trả về toàn bộ lịch sử lượt nghe khi không truyền visitorId', async () => {
    const history = await service.history();
    expect(history).toHaveLength(2);
    expect(findHistoryMock).toHaveBeenCalledWith(undefined);
  });

  it('ghi nhận heartbeat của du khách thực tế và cập nhật lastSeenAt', async () => {
    const hb = await service.heartbeat({
      visitorId: 'vis-100',
      passCode: 'DEMO-2026',
      language: Language.vi,
      currentPoiId: 'chua-linh-ung-cong-tam-quan',
      deviceInfo: 'Mozilla/5.0 Android',
    });

    expect(hb.visitorId).toBe('vis-100');
    expect(upsertHeartbeatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        visitorId: 'vis-100',
        passCode: 'DEMO-2026',
      }),
    );
  });

  it('đánh dấu du khách rời trang (leave) qua navigator.sendBeacon', async () => {
    const res = await service.leave({ visitorId: 'vis-100' });
    expect(res.ok).toBe(true);
    expect(res.visitorId).toBe('vis-100');
    expect(markLeaveMock).toHaveBeenCalledWith('vis-100');
  });

  it('lấy danh sách du khách đang hoạt động (active visitors)', async () => {
    const list = await service.getActiveVisitors(60);
    expect(list).toHaveLength(1);
    expect(getActiveSessionsMock).toHaveBeenCalledWith(60);
  });
});


