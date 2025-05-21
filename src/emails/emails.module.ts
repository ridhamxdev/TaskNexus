import { Module } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { EmailsController } from './emails.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Email } from './entities/email.entity';
import { EmailUtils } from './email-utils';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Email]),
    RedisModule,
  ],
  controllers: [EmailsController],
  providers: [
    EmailsService,
    EmailUtils,
  ],
  exports: [EmailsService, EmailUtils],
})
export class EmailsModule {}
