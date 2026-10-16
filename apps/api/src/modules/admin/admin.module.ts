import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminKeyGuard } from './admin-key.guard';

@Module({ controllers: [AdminController], providers: [AdminKeyGuard] })
export class AdminModule {}
