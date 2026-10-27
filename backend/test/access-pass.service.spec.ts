import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Language, PassStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessPassRepository } from '../src/access-pass/access-pass.repository.js';
import { AccessPassService } from '../src/access-pass/access-pass.service.js';

describe('AccessPassService', () => {
  let service: AccessPassService;
  let repoMock: Partial<AccessPassRepository>;

  beforeEach(() => {
    repoMock = {
      findByCode: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn(),
      getTourPackage: vi.fn(),
    };
    service = new AccessPassService(repoMock as AccessPassRepository);
  });

  it('tạo access pass mới với thời hạn mặc định 24h', async () => {
    const mockPass = {
      id: 'pass-1',
      code: 'QR-TEST-1234',
      tourId: null,
      status: PassStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      activatedAt: null,
      deviceInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (repoMock.create as any).mockResolvedValue(mockPass);

    const result = await service.create({ code: 'QR-TEST-1234' });
    expect(result.code).toBe('QR-TEST-1234');
    expect(repoMock.create).toHaveBeenCalledOnce();
  });

  it('báo lỗi NotFoundException khi mã pass không tồn tại trong hệ thống', async () => {
    (repoMock.findByCode as any).mockResolvedValue(null);

    await expect(service.validateCode('INVALID-CODE')).rejects.toThrow(NotFoundException);
  });

  it('xác thực đúng trạng thái hợp lệ của access pass còn hạn', async () => {
    const mockPass = {
      id: 'pass-2',
      code: 'QR-VALID-1',
      tourId: 'tour-hcm',
      status: PassStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 100000),
      activatedAt: new Date(),
      deviceInfo: 'iOS Safari',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (repoMock.findByCode as any).mockResolvedValue(mockPass);

    const check = await service.validateCode('QR-VALID-1');
    expect(check.isValid).toBe(true);
    expect(check.status).toBe(PassStatus.ACTIVE);
  });

  it('kích hoạt thành công pass và trả về gói dữ liệu tour đầy đủ', async () => {
    const mockPass = {
      id: 'pass-3',
      code: 'DEMO-PASS',
      tourId: null,
      status: PassStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 100000),
      activatedAt: null,
      deviceInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPackage = {
      selectedTour: null,
      pois: [
        { id: 'dinh-doc-lap', name: 'Dinh Độc Lập', narration: { title: 'Dinh Độc Lập', content: 'Thuyết minh...' } },
      ],
    };

    (repoMock.findByCode as any).mockResolvedValue(mockPass);
    (repoMock.updateStatus as any).mockResolvedValue({ ...mockPass, status: PassStatus.ACTIVE, activatedAt: new Date() });
    (repoMock.getTourPackage as any).mockResolvedValue(mockPackage);

    const res = await service.activate({
      code: 'DEMO-PASS',
      language: Language.vi,
      deviceInfo: 'Android Chrome',
    });

    expect(res.accessPass.code).toBe('DEMO-PASS');
    expect(res.package.pois).toHaveLength(1);
    expect(repoMock.updateStatus).toHaveBeenCalled();
  });

  it('từ chối kích hoạt nếu pass đã hết hạn', async () => {
    const expiredPass = {
      id: 'pass-expired',
      code: 'EXPIRED-PASS',
      tourId: null,
      status: PassStatus.ACTIVE,
      expiresAt: new Date(Date.now() - 50000), // đã hết hạn trong quá khứ
      activatedAt: null,
      deviceInfo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (repoMock.findByCode as any).mockResolvedValue(expiredPass);
    (repoMock.updateStatus as any).mockResolvedValue({ ...expiredPass, status: PassStatus.EXPIRED });

    await expect(
      service.activate({ code: 'EXPIRED-PASS', language: Language.vi })
    ).rejects.toThrow(BadRequestException);
  });
});
