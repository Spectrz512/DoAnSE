/**
 * ==============================================================================
 * BẢO MẬT & XÁC THỰC QUẢN TRỊ VIÊN (ADMIN KEY GUARD)
 * ==============================================================================
 * Vai trò:
 * - Chặn và kiểm tra header 'x-admin-key' đối chiếu với ADMIN_API_KEY trong .env.
 * - Từ chối 401 Unauthorized nếu key không hợp lệ, bảo vệ an toàn các API CRUD.
 * ==============================================================================
 */

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const configuredKey = process.env.ADMIN_API_KEY || process.env.ADMIN_KEY || 'local-admin-key-change-me';
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    if (request.headers['x-admin-key'] !== configuredKey) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}

