import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { CacheModule, CACHE_MANAGER } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
// We will create the User model (entity) later
// import { User } from './users/entities/user.entity'; // Or a common entities folder
import { EmailsModule } from './emails/emails.module';
import { AuthModule } from './auth/auth.module';
import { TestDeductionController } from './test-deduction/test-deduction.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigService available globally
      envFilePath: '.env', // Specify the .env file path
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', ''),
        database: configService.get('DB_NAME', 'your_database_name'),
        autoLoadModels: true,
        synchronize: true, // Be careful with this in production
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
    EmailsModule, // UsersModule is already imported by CLI
    AuthModule,
  ],
  controllers: [AppController, TestDeductionController],
  providers: [AppService],
})
export class AppModule {}
