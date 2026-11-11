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

    // Ưu tiên IP được cấu hình trong biến môi trường SERVER_LAN_IP
    if (process.env.SERVER_LAN_IP) {
      addresses.push(process.env.SERVER_LAN_IP.trim());
    }

    // Nhận diện hostname / IP mà client vừa dùng để gọi tới server
    const rawHost = ((req.headers['x-forwarded-host'] || req.headers.host || req.hostname || '') as string).trim();
    const clientHost = rawHost.split(':')[0];
    if (clientHost && clientHost !== 'localhost' && clientHost !== '127.0.0.1' && !addresses.includes(clientHost)) {
      addresses.push(clientHost);
    }

    // Quét các interface mạng IPv4 thực tế qua Node.js os module
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!iface.address.startsWith('127.') && !iface.address.startsWith('169.254.')) {
            if (!addresses.includes(iface.address)) {
              addresses.push(iface.address);
            }
          }
        }
      }
    }

    // Chọn địa chỉ LAN thông dụng (192.168.x.x, 10.x.x.x, 172.16-31.x.x) làm primaryIp
    const primaryIp =
      addresses.find(
        (ip) =>
          ip.startsWith('192.168.') ||
          ip.startsWith('10.') ||
          (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) && !ip.startsWith('172.18.')),
      ) ||
      addresses[0] ||
      'localhost';

    const webPort = 8080;
    const apiPort = Number(process.env.PORT ?? 3000);

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
