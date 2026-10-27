import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Language, PassStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AccessPassRepository } from './access-pass.repository.js';
import { ActivateAccessPassDto, CreateAccessPassDto } from './dto.js';

@Injectable()
export class AccessPassService {
  constructor(private readonly repository: AccessPassRepository) {}

  async create(dto: CreateAccessPassDto) {
    const code = dto.code || `QR-${randomBytes(4).toString('hex').toUpperCase()}`;
    const hours = dto.expiresInHours ?? 24;
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000);

    return this.repository.create({
      code,
      tourId: dto.tourId ?? null,
      status: PassStatus.ACTIVE,
      expiresAt,
    });
  }

  async validateCode(code: string) {
    const pass = await this.repository.findByCode(code);
    if (!pass) {
      throw new NotFoundException(`Access pass với mã ${code} không tồn tại.`);
    }

    const now = new Date();
    const isExpired = pass.expiresAt ? pass.expiresAt < now : false;
    const isRevoked = pass.status === PassStatus.REVOKED;

    return {
      code: pass.code,
      status: isExpired ? PassStatus.EXPIRED : pass.status,
      isValid: !isExpired && !isRevoked,
      expiresAt: pass.expiresAt,
      tourId: pass.tourId,
    };
  }

  async activate(dto: ActivateAccessPassDto) {
    const code = dto.code.trim();
    let pass = await this.repository.findByCode(code);

    // Hỗ trợ chế độ Demo / Quick Pass: nếu pass chưa có trong DB mà có prefix DEMO hoặc PASS thì tự khởi tạo pass hợp lệ 24h
    if (!pass && (code.startsWith('DEMO-') || code.startsWith('PASS-') || code.startsWith('TOUR-'))) {
      pass = await this.create({
        code,
        expiresInHours: 24,
      });
    }

    if (!pass) {
      throw new NotFoundException(`Mã Access Pass [${code}] không hợp lệ hoặc chưa được đăng ký.`);
    }

    const now = new Date();
    if (pass.expiresAt && pass.expiresAt < now) {
      await this.repository.updateStatus(pass.id, PassStatus.EXPIRED);
      throw new BadRequestException('Mã Access Pass đã hết hạn sử dụng. Vui lòng quét mã QR mới.');
    }

    if (pass.status === PassStatus.REVOKED) {
      throw new BadRequestException('Mã Access Pass này đã bị thu hồi hoặc đã bị hủy.');
    }

    // Đánh dấu kích hoạt
    const updatedPass = await this.repository.updateStatus(
      pass.id,
      PassStatus.ACTIVE,
      pass.activatedAt ?? now,
      dto.deviceInfo
    );

    const lang = (dto.language ?? Language.vi) as Language;
    const packageData = await this.repository.getTourPackage(pass.tourId, lang);

    return {
      message: 'Kích hoạt Access Pass thành công! Dữ liệu tour đã sẵn sàng.',
      accessPass: {
        code: updatedPass.code,
        status: updatedPass.status,
        expiresAt: updatedPass.expiresAt,
        activatedAt: updatedPass.activatedAt,
      },
      language: lang,
      package: packageData,
    };
  }
}
