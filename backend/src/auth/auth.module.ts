import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { OTPService } from './otp.service';
import { EmailsModule } from '../emails/emails.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { OTP } from './entities/otp.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    ConfigModule,
    SequelizeModule.forFeature([OTP, Tenant]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '60m') },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => EmailsModule),
  ],
  providers: [AuthService, JwtStrategy, OTPService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, OTPService],
})
export class AuthModule {} 