import { describe, expect, it, vi } from 'vitest';
import { AppController } from '../src/app.controller.js';
import type { PrismaService } from '../src/database/prisma.service.js';

describe('AppController (UC9 - System Health Check)', () => {
  it('trả về status ok và database connected khi Prisma query SELECT 1 thành công', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;

    const controller = new AppController(mockPrisma);
    const result = await controller.health();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.timestamp).toBeDefined();
    expect(typeof result.uptime).toBe('number');
  });

  it('trả về database disconnected nhưng không sập hệ thống khi Prisma query thất bại', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('Connection lost')),
    } as unknown as PrismaService;

    const controller = new AppController(mockPrisma);
    const result = await controller.health();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('disconnected');
    expect(result.timestamp).toBeDefined();
  });

  it('trả về network info đầy đủ primaryIp, addresses, webPort, apiPort', () => {
    const mockPrisma = {} as unknown as PrismaService;
    const controller = new AppController(mockPrisma);
    const mockReq = {
      headers: { host: '192.168.1.100:3000' },
      hostname: '192.168.1.100',
    } as any;

    const result = controller.getNetworkInfo(mockReq);

    expect(result.status).toBe('ok');
    expect(result.primaryIp).toBeDefined();
    expect(Array.isArray(result.addresses)).toBe(true);
    expect(result.webPort).toBe(3000);
    expect(result.apiPort).toBe(3000);
    expect(result.suggestedOrigins.length).toBeGreaterThan(0);
  });
});

