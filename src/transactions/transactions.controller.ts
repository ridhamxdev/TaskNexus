import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('update-balance')
  @Roles(UserRole.ADMIN)
  async updateUserBalance(
    @Body() body: { userId: number; amount: number }
  ) {
    return this.transactionsService.updateUserBalance(body.userId, body.amount);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN)
  async getUserTransactions(@Param('userId') userId: number) {
    return this.transactionsService.getUserTransactions(userId);
  }

  @Post('test-deduction')
  @Roles(UserRole.ADMIN)
  async testDailyDeduction() {
    return this.transactionsService.processDailyDeductions();
  }
} 