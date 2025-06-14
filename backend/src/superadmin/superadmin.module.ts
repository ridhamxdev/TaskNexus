import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SuperadminController } from './superadmin.controller';
import { SetupController } from './setup.controller';
import { SuperadminService } from './superadmin.service';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Email } from '../emails/entities/email.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { EmailsModule } from '../emails/emails.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';

@Module({
  imports: [
    SequelizeModule.forFeature([User, Transaction, Email]),
    TransactionsModule,
    EmailsModule,
    ScheduleModule.forRoot()
  ],
  controllers: [SuperadminController, SetupController],
  providers: [SuperadminService, SuperAdminGuard],
  exports: [SuperadminService]
})
export class SuperadminModule {} 