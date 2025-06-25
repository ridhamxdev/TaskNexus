import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { IsEmail, IsString, IsNumber } from 'class-validator';
import { JwtAuthGuard } from './jwt-auth.guard';

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

export class Enable2FADto {
  @IsString()
  password: string;
}

export class Confirm2FADto {
  @IsString()
  otp: string;
}

export class Disable2FADto {
  @IsString()
  password: string;
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

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('enable-2fa')
  enable2FA(@Request() req, @Body() enable2FADto: Enable2FADto) {
    return this.authService.enable2FA(req.user.userId, enable2FADto.password);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('confirm-enable-2fa')
  confirmEnable2FA(@Request() req, @Body() confirm2FADto: Confirm2FADto) {
    return this.authService.confirm2FAEnable(req.user.userId, confirm2FADto.otp);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('disable-2fa')
  disable2FA(@Request() req, @Body() disable2FADto: Disable2FADto) {
    return this.authService.disable2FA(req.user.userId, disable2FADto.password);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('confirm-disable-2fa')
  confirmDisable2FA(@Request() req, @Body() confirm2FADto: Confirm2FADto) {
    return this.authService.confirm2FADisable(req.user.userId, confirm2FADto.otp);
  }
} 