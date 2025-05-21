import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { RabbitMQModule, RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { EmailsModule } from './emails/emails.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
        synchronize: true,
        define: {
          timestamps: true,
          underscored: true,
        },
      }),
      inject: [ConfigService],
    }),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): RabbitMQConfig => {
        const uri = configService.get<string>('RABBITMQ_URL');
        if (!uri) {
          throw new Error('RABBITMQ_URL environment variable is not set.');
        }
        return {
          exchanges: [
            {
              name: configService.get<string>('RABBITMQ_EMAIL_EXCHANGE', 'email_exchange'),
              type: 'direct',
            },
            {
              name: configService.get<string>('RABBITMQ_EMAIL_DLX_EXCHANGE', 'email_dlx_exchange'),
              type: 'fanout',
            },
          ],
          uri: uri,
          connectionInitOptions: { wait: false },
          queues: [
              {
                  name: configService.get<string>('RABBITMQ_EMAIL_SEND_QUEUE', 'email_send_queue'),
                  exchange: configService.get<string>('RABBITMQ_EMAIL_EXCHANGE', 'email_exchange'),
                  routingKey: 'email.send',
                  options: {
                    durable: true,
                  }
              },
              {
                  name: configService.get<string>('RABBITMQ_EMAIL_DEAD_LETTER_QUEUE', 'email_dead_letter_queue'),
                  exchange: configService.get<string>('RABBITMQ_EMAIL_DLX_EXCHANGE', 'email_dlx_exchange'),
                  options: { durable: true }
              }
          ]
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    EmailsModule,
    AuthModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
