import { Module } from '@nestjs/common';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './entities/user.entity';
import { UserNotification } from './entities/user-notification.entity';
import { FeeVersion } from '../superadmin/entities/fee-version.entity';
import { GlobalFeeVersion } from '../superadmin/entities/global-fee-version.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { SuperadminModule } from '../superadmin/superadmin.module';
// JwtModule and ConfigModule are no longer needed here as JWT handling is in AuthModule
// import { JwtModule } from '@nestjs/jwt';
// import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    SequelizeModule.forFeature([User, UserNotification, FeeVersion, GlobalFeeVersion]),
    TransactionsModule,
    SuperadminModule,
    // JwtModule.registerAsync removed
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
