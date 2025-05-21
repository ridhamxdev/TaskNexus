import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Transaction } from './entities/transaction.entity';
import { TransactionLog } from './entities/transaction-log.entity';
import { TransactionsService } from './transactions.service';
import { User } from '../users/entities/user.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([Transaction, TransactionLog, User]),
    ScheduleModule.forRoot(),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {} 