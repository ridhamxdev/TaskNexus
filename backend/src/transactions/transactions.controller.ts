import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';

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
}