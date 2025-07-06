import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SuperadminService, Settings } from './superadmin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { SubscriptionStatus } from '../subscriptions/entities/user-subscription.entity';
import { FeeConfigurationDto, BulkFeeConfigurationDto } from './dto/fee-configuration.dto';
import { CreateDefaultFeeConfigurationDto, UpdateDefaultFeeConfigurationDto, ToggleUserDefaultFeeDto } from './dto/default-fee-configuration.dto';

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

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.superadminService.getUserById(parseInt(id, 10));
  }

  @Put('users/:id/status')
  async updateUserStatus(@Param('id') id: string, @Body() body: { status: 'Active' | 'Inactive' }) {
    return this.superadminService.updateUserStatus(parseInt(id), body.status);
  }

  @Put('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.superadminService.updateUserRole(parseInt(id), body.role);
  }

  // Fee Configuration
  @Get('users/:userId/fees')
  async getFeeConfigurations(@Param('userId') userId: string) {
    return this.superadminService.getSendMoneyFeeConfigurationsForUser(parseInt(userId, 10));
  }

  // Subscription Fee Configuration
  @Get('users/:userId/fees/subscription')
  async getSubscriptionFeeConfigurations(@Param('userId') userId: string) {
    return this.superadminService.getSubscriptionFeeConfigurationsForUser(parseInt(userId, 10));
  }

  @Get('users/:userId/subscription-plans/available')
  async getAvailableSubscriptionPlansForFeeConfig(@Param('userId') userId: string) {
    return this.superadminService.getAvailableSubscriptionPlansForFeeConfig(parseInt(userId, 10));
  }

  @Post('users/:userId/fees')
  async createFeeConfiguration(
    @Param('userId') userId: string,
    @Body() dto: FeeConfigurationDto,
  ) {
    return this.superadminService.createFeeConfiguration(parseInt(userId, 10), dto);
  }

  @Put('fees/:feeId')
  async updateFeeConfiguration(
    @Param('feeId') feeId: string,
    @Body() dto: FeeConfigurationDto,
  ) {
    return this.superadminService.updateFeeConfiguration(parseInt(feeId, 10), dto);
  }

  @Delete('fees/:feeId')
  async deleteFeeConfiguration(@Param('feeId') feeId: string) {
    return this.superadminService.deleteFeeConfiguration(parseInt(feeId, 10));
  }

  @Put('users/:userId/fees/bulk')
  async bulkUpdateFeeConfigurations(
    @Param('userId') userId: string,
    @Body() dto: BulkFeeConfigurationDto,
  ) {
    return this.superadminService.bulkUpdateFeeConfigurations(parseInt(userId, 10), dto);
  }

  // Default Fee Configuration
  @Get('default-fee')
  async getDefaultFeeConfiguration() {
    return this.superadminService.getDefaultFeeConfiguration();
  }

  @Post('default-fee')
  async createDefaultFeeConfiguration(@Body() dto: CreateDefaultFeeConfigurationDto) {
    return this.superadminService.createDefaultFeeConfiguration(dto);
  }

  @Put('default-fee/:configId')
  async updateDefaultFeeConfiguration(
    @Param('configId') configId: string,
    @Body() dto: UpdateDefaultFeeConfigurationDto,
  ) {
    return this.superadminService.updateDefaultFeeConfiguration(parseInt(configId, 10), dto);
  }

  @Put('users/:userId/default-fee-toggle')
  async toggleUserDefaultFee(
    @Param('userId') userId: string,
    @Body() dto: ToggleUserDefaultFeeDto,
  ) {
    return this.superadminService.toggleUserDefaultFee(parseInt(userId, 10), dto);
  }

  @Get('users/:userId/default-fee-status')
  async getUserDefaultFeeStatus(@Param('userId') userId: string) {
    return this.superadminService.getUserDefaultFeeStatus(parseInt(userId, 10));
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

  // Subscription Management
  @Get('subscriptions')
  async getAllSubscriptions() {
    return this.superadminService.getAllSubscriptions();
  }

  @Get('subscriptions/stats')
  async getSubscriptionStats() {
    return this.superadminService.getSubscriptionStats();
  }

  @Get('subscriptions/plans')
  async getAllSubscriptionPlans() {
    return this.superadminService.getAllSubscriptionPlans();
  }

  @Post('subscriptions/plans')
  async createSubscriptionPlan(@Body() planData: {
    name: string;
    description: string;
    price: number;
    billingCycle: string;
    features: any;
    emailLimit: number;
    transactionLimit: number;
    status: string;
    sortOrder: number;
  }) {
    return this.superadminService.createSubscriptionPlan(planData);
  }

  @Put('subscriptions/plans/:id')
  async updateSubscriptionPlan(@Param('id') id: string, @Body() updates: any) {
    return this.superadminService.updateSubscriptionPlan(parseInt(id), updates);
  }

  @Put('subscriptions/:id')
  async updateUserSubscription(@Param('id') id: string, @Body() updates: {
    status?: SubscriptionStatus;
    autoRenew?: boolean;
    cancellationReason?: string;
  }) {
    return this.superadminService.updateUserSubscription(parseInt(id), updates);
  }

  @Get('users/:id/subscriptions')
  async getUserSubscriptionDetails(@Param('id') id: string) {
    return this.superadminService.getUserSubscriptionDetails(parseInt(id));
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

  // Impersonation endpoints
  @Post('impersonate')
  async startImpersonation(@Body() body: { targetUserId: number }, @Req() req: any) {
    return this.superadminService.startImpersonation(req.user.id, body.targetUserId);
  }

  @Post('stop-impersonation')
  async stopImpersonation(@Req() req: any) {
    return this.superadminService.stopImpersonation(req.user.originalUserId || req.user.id);
  }

  // Special endpoint to create superadmin (should be protected or used only for initial setup)
  @Post('create-superadmin')
  async createSuperadmin(@Body() userData: { name: string; email: string; password: string; phone: string }) {
    return this.superadminService.createSuperadmin(userData);
  }
} 