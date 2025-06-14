import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { IsEmail, IsString, IsNumber } from 'class-validator';

// DTOs for 2FA
export class VerifyOTPDto {
  @IsEmail()
  email: string;

  @IsString()
  otp: string;

  @IsNumber()
  tempUserId: number;
}

export class ResendOTPDto {
  @IsEmail()
  email: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  verifyOTP(@Body() verifyOTPDto: VerifyOTPDto) {
    return this.authService.verifyLoginOTP(
      verifyOTPDto.email,
      verifyOTPDto.otp,
      verifyOTPDto.tempUserId
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  resendOTP(@Body() resendOTPDto: ResendOTPDto) {
    return this.authService.resendOTP(resendOTPDto.email);
  }
} 