import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-redis-store';
import { User } from './users/entities/user.entity';
import { Transaction } from './transactions/entities/transaction.entity';
import { OTP } from './auth/entities/otp.entity';
import { EmailsModule } from './emails/emails.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SuperadminModule } from './superadmin/superadmin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigService available globally
      envFilePath: '.env', // Specify the .env file path
    }),
    ScheduleModule.forRoot(),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_NAME', 'your_database_name'),
        models: [User, Transaction, OTP],
        autoLoadModels: true,
        synchronize: true, // Be careful with this in production
        logging: false, // Disable SQL query logging
        define: {
          timestamps: true,
          underscored: true,
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      isGlobal: true, // Make cache manager global
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        // password: configService.get<string>('REDIS_PASSWORD'), // Uncomment if password is set
        ttl: 60 * 10, // Default TTL 10 minutes, can be overridden
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    EmailsModule,
    AuthModule,
    TransactionsModule,
    SuperadminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
