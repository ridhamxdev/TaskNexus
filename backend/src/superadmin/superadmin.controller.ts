import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SuperadminService, Settings } from './superadmin.service';
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

  // Settings Management
  @Get('settings')
  async getSettings(): Promise<Settings> {
    return this.superadminService.getSettings();
  }

  @Put('settings')
  async updateSettings(@Body() settings: Settings): Promise<{ message: string }> {
    return this.superadminService.updateSettings(settings);
  }

  // Notifications Management
  @Get('notifications')
  async getNotifications() {
    return this.superadminService.getNotifications();
  }

  @Put('notifications/:id/read')
  async markNotificationAsRead(@Param('id') id: string) {
    return this.superadminService.markNotificationAsRead(parseInt(id));
  }

  @Put('notifications/mark-all-read')
  async markAllNotificationsAsRead() {
    return this.superadminService.markAllNotificationsAsRead();
  }

  // Special endpoint to create superadmin (should be protected or used only for initial setup)
  @Post('create-superadmin')
  async createSuperadmin(@Body() userData: { name: string; email: string; password: string; phone: string }) {
    return this.superadminService.createSuperadmin(userData);
  }
} 