import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { AccessPassController } from './access-pass.controller.js';
import { AccessPassRepository } from './access-pass.repository.js';
import { AccessPassService } from './access-pass.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AccessPassController],
  providers: [AccessPassService, AccessPassRepository],
  exports: [AccessPassService, AccessPassRepository],
})
export class AccessPassModule {}
