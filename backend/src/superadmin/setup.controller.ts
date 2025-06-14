import { Controller, Post, Body } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly superadminService: SuperadminService) {}

  // Special endpoint to create superadmin (for initial setup only)
  @Post('create-superadmin')
  async createSuperadmin(@Body() userData: { name: string; email: string; password: string; phone: string }) {
    return this.superadminService.createSuperadmin(userData);
  }
} 