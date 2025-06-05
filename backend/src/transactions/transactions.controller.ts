import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TransactionsService } from './transactions.service';


@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}
  @Post('trigger-deduction')
  async triggerDeduction() {
    return this.transactionsService.triggerDeductionScript();
  }

  @Get()
  async getAllTransactions() {
    return this.transactionsService.findAll();
  }
}