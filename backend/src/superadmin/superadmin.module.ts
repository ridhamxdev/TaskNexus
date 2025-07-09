import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperadminController } from './superadmin.controller';
import { SetupController } from './setup.controller';
import { SuperadminService } from './superadmin.service';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Email } from '../emails/entities/email.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { SubscriptionPayment } from '../subscriptions/entities/subscription-payment.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { EmailsModule } from '../emails/emails.module';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { FeeConfiguration } from './entities/fee-configuration.entity';
import { DefaultFeeConfiguration } from './entities/default-fee-configuration.entity';
import { FeeConfigurationVersion } from './entities/fee-configuration-version.entity';
import { FeeVersion } from './entities/fee-version.entity';
import { UserNotification } from '../users/entities/user-notification.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
        SequelizeModule.forFeature([
      User,
      Transaction,
      Email,
      UserSubscription,
      SubscriptionPlan,
      SubscriptionPayment,
      FeeConfiguration,
      DefaultFeeConfiguration,
      FeeConfigurationVersion,
      FeeVersion,
      UserNotification
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => TransactionsModule),
    forwardRef(() => EmailsModule),
    forwardRef(() => SubscriptionsModule)
  ],
  controllers: [SuperadminController, SetupController],
  providers: [SuperadminService, SuperAdminGuard],
  exports: [SuperadminService]
})
export class SuperadminModule {} 