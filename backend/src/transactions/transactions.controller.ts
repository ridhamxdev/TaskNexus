import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SendMoneyDto } from './dto/send-money.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto, @Req() req) {
    // Set the userId from the authenticated user
    createTransactionDto.userId = req.user.userId;
    return this.transactionsService.createTransaction(createTransactionDto);
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendMoney(@Body() sendMoneyDto: SendMoneyDto, @Req() req) {
    const senderId = req.user.userId;
    return this.transactionsService.sendMoney(senderId, sendMoneyDto);
  }

  @Post('trigger-deduction')
  @UseGuards(JwtAuthGuard)
  async triggerDeduction(@Req() req) {
    return this.transactionsService.triggerDeductionScript(req.user.userId);
  }

  @Post('trigger-script-deduction')
  @UseGuards(JwtAuthGuard)
  async triggerScriptDeduction() {
    return this.transactionsService.manualScriptDeduction();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllTransactions() {
    return this.transactionsService.findAll();
  }

  @Get('with-fees')
  @UseGuards(JwtAuthGuard)
  async getTransactionsWithFees() {
    return this.transactionsService.getTransactionsWithFees();
  }

  @Get('fee-transactions')
  @UseGuards(JwtAuthGuard)
  async getAllFeeTransactions() {
    return this.transactionsService.getAllFeeTransactions();
  }

  @Get('user/:id')
  @UseGuards(JwtAuthGuard)
  async getTransactionsByUserId(@Param('id') id: string, @Req() req) {
    // A user can only access their own transactions, but a superadmin can access any.
    // This logic should be adapted based on your exact authorization requirements.
    const requestedUserId = parseInt(id, 10);
    const requestingUser = req.user;

    if (requestingUser.role !== 'superadmin' && requestingUser.userId !== requestedUserId) {
      throw new Error('You are not authorized to view these transactions.');
    }

    return this.transactionsService.findByUserId(requestedUserId);
  }

  @Get('user/:id/with-fees')
  @UseGuards(JwtAuthGuard)
  async getUserTransactionsWithFees(@Param('id') id: string, @Req() req) {
    // A user can only access their own transactions, but a superadmin can access any.
    const requestedUserId = parseInt(id, 10);
    const requestingUser = req.user;

    if (requestingUser.role !== 'superadmin' && requestingUser.userId !== requestedUserId) {
      throw new Error('You are not authorized to view these transactions.');
    }

    return this.transactionsService.getUserTransactionsWithFees(requestedUserId);
  }
}