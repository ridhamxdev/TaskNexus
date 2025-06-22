import { Module, forwardRef } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Email } from './entities/email.entity';
import { EmailUtils } from './email-utils';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Email]),
    forwardRef(() => SubscriptionsModule),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('RABBITMQ_URI', 'amqp://localhost:5672'),
        exchanges: [
          {
            name: 'email_exchange',
            type: 'direct',
          },
        ],
        queues: [
          {
            name: 'email_send_queue',
            exchange: 'email_exchange',
            routingKey: 'email.send',
            options: {
              durable: true,
            },
          },
        ],
      }),
    }),
  ],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    EmailUtils,
  ],
  exports: [EmailsService, EmailUtils],
})
export class EmailsModule {}
