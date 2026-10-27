import { Module } from '@nestjs/common';
import { PoiModule } from '../poi/poi.module.js';
import { AdminController } from './admin.controller.js';
import { AdminKeyGuard } from './admin-key.guard.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';
@Module({ imports: [PoiModule], controllers: [AdminController], providers: [AdminService, AdminRepository, AdminKeyGuard] }) export class AdminModule {}
