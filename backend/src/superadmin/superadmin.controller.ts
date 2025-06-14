import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SuperadminService, CronJobInfo } from './superadmin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';

@Controller('superadmin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  // Dashboard Stats
  @Get('stats')
  async getDashboardStats() {
    return this.superadminService.getDashboardStats();
  }

  // User Management
  @Get('users')
  async getAllUsers() {
    return this.superadminService.getAllUsers();
  }

  @Put('users/:id/status')
  async updateUserStatus(@Param('id') id: string, @Body() body: { status: 'Active' | 'Inactive' }) {
    return this.superadminService.updateUserStatus(parseInt(id), body.status);
  }

  // Transaction Management
  @Get('transactions')
  async getAllTransactions() {
    return this.superadminService.getAllTransactions();
  }

  // Email Management
  @Get('emails')
  async getAllEmails() {
    return this.superadminService.getAllEmails();
  }

  @Post('emails/:id/resend')
  async resendEmail(@Param('id') id: string) {
    return this.superadminService.resendEmail(parseInt(id));
  }

  // Cron Job Management
  @Get('cron-jobs')
  async getCronJobs(): Promise<CronJobInfo[]> {
    return this.superadminService.getCronJobs();
  }

  @Post('cron-jobs')
  async createCronJob(@Body() cronJobData: any) {
    return this.superadminService.createCronJob(cronJobData);
  }

  @Put('cron-jobs/:name')
  async updateCronJob(@Param('name') name: string, @Body() cronJobData: any) {
    return this.superadminService.updateCronJob(name, cronJobData);
  }

  @Delete('cron-jobs/:name')
  async deleteCronJob(@Param('name') name: string) {
    return this.superadminService.deleteCronJob(name);
  }

  @Post('cron-jobs/:name/run')
  async runCronJobNow(@Param('name') name: string) {
    return this.superadminService.runCronJobNow(name);
  }

  // Special endpoint to create superadmin (should be protected or used only for initial setup)
  @Post('create-superadmin')
  async createSuperadmin(@Body() userData: { name: string; email: string; password: string; phone: string }) {
    return this.superadminService.createSuperadmin(userData);
  }
} 