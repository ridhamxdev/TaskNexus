import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { OTPService } from './otp.service';
import { EmailService } from '../emails/email.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { OTP } from './entities/otp.entity';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    SequelizeModule.forFeature([OTP]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '60m') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, OTPService, EmailService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, OTPService, EmailService],
})
export class AuthModule {} 