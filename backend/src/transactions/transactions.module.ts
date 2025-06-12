import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Transaction } from './entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { EmailsModule } from '../emails/emails.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionLog } from './entities/transaction-log.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Transaction, User, TransactionLog]),
    EmailsModule,
    ScheduleModule.forRoot()
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {} 