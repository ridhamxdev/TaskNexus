import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionCronService } from './subscription-cron.service';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { User } from '../users/entities/user.entity';
import { EmailsModule } from '../emails/emails.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CacheModule } from '@nestjs/cache-manager';
import { FeeConfiguration } from '../superadmin/entities/fee-configuration.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([
      SubscriptionPlan,
      UserSubscription,
      SubscriptionPayment,
      User,
      FeeConfiguration
    ]),
    CacheModule.register(),
    forwardRef(() => EmailsModule),
    forwardRef(() => TransactionsModule),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionCronService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {} 