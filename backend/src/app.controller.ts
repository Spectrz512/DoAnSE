/**
 * ==============================================================================
 * BỘ ĐIỀU KHIỂN HỆ THỐNG & SỨC KHỎE MÁY CHỦ (SYSTEM & HEALTH CONTROLLER)
 * ==============================================================================
 * Vai trò:
 * - GET /health: Healthcheck thời gian thực kiểm tra kết nối CSDL PostgreSQL (SELECT 1).
 * - GET /api/system/network-info:
 *   + Quét danh sách card mạng IPv4 thật (Wi-Fi, Ethernet).
 *   + Tự động loại bỏ hoàn toàn các IP ảo (WSL, Docker bridge 172.x, VirtualBox 192.168.56.x).
 *   + Trả về primaryIp thật của máy chủ (ví dụ 192.168.1.6) cho mã QR trên điện thoại.
 * ==============================================================================
 */

import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import * as os from 'node:os';
import { PrismaService } from './database/prisma.service.js';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(['health', 'api/health'])
  async health() {
    let dbStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get(['system/network-info', 'api/system/network-info'])
  getNetworkInfo(@Req() req: Request) {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    // 1. Ưu tiên IP được cấu hình trong biến môi trường SERVER_LAN_IP
    if (process.env.SERVER_LAN_IP) {
      addresses.push(process.env.SERVER_LAN_IP.trim());
    }

    const VIRTUAL_NAME_REGEX = /vethernet|wsl|docker|virtualbox|vmware|hyper-v|loopback|pseudo|bluetooth/i;

    const isVirtualIp = (ip: string): boolean => {
      if (ip.startsWith('127.') || ip.startsWith('169.254.')) return true;
      if (ip.startsWith('192.168.56.') || ip.startsWith('192.168.65.')) return true;
      // Dải IP nội bộ ảo Docker / WSL / Hyper-V bridge (172.16.0.0 - 172.31.255.255)
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
      return false;
    };

    // 2. Nhận diện hostname / IP mà client vừa dùng để gọi tới server (nếu là IP LAN hợp lệ)
    const hostHeader = ((req.headers['x-forwarded-host'] || req.headers.host || req.hostname || '') as string).trim();
    const clientHost = hostHeader.split(':')[0];
    const clientPort = hostHeader.includes(':') ? Number(hostHeader.split(':')[1]) : undefined;
    if (clientHost && clientHost !== 'localhost' && clientHost !== '127.0.0.1' && !isVirtualIp(clientHost) && !addresses.includes(clientHost)) {
      addresses.push(clientHost);
    }

    // 3. Quét các card mạng IPv4 thật (Wi-Fi, Ethernet)
    for (const name of Object.keys(interfaces)) {
      if (VIRTUAL_NAME_REGEX.test(name)) continue;
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!isVirtualIp(iface.address) && !addresses.includes(iface.address)) {
            addresses.push(iface.address);
          }
        }
      }
    }

    // 4. Chọn địa chỉ LAN thật sự tối ưu làm primaryIp (không để rơi vào localhost)
    const fallbackLanIp = (process.env.SERVER_LAN_IP || '192.168.1.6').trim();
    const primaryIp =
      (process.env.SERVER_LAN_IP && addresses.includes(process.env.SERVER_LAN_IP.trim()) ? process.env.SERVER_LAN_IP.trim() : null) ||
      addresses.find((ip) => ip.startsWith('192.168.1.') || ip.startsWith('192.168.0.')) ||
      addresses.find((ip) => ip.startsWith('192.168.')) ||
      addresses.find((ip) => ip.startsWith('10.')) ||
      addresses.find((ip) => ip !== 'localhost' && ip !== '127.0.0.1') ||
      fallbackLanIp;

    if (!addresses.includes(primaryIp)) {
      addresses.unshift(primaryIp);
    }

    const apiPort = Number(process.env.PORT ?? 3000);
    const webPort = clientPort || (process.env.WEB_PORT ? Number(process.env.WEB_PORT) : apiPort);

    const suggestedOrigins = [
      ...addresses.map((ip) => `http://${ip}:${webPort}`),
      `http://localhost:${webPort}`,
    ];

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      primaryIp,
      addresses,
      webPort,
      apiPort,
      suggestedOrigins: Array.from(new Set(suggestedOrigins)),
    };
  }
}
