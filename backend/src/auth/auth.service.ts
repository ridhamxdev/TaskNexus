import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { OTPService } from './otp.service';
import { EmailsService } from '../emails/emails.service';
import { InjectModel } from '@nestjs/sequelize';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private otpService: OTPService,
    private emailsService: EmailsService,
    @InjectModel(Tenant) private tenantModel: typeof Tenant,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    
    if (!user) {
      return null;
    }
    
    if (!user.password_hash) {
      return null;
    }
    
    try {
      const isMatch = await bcrypt.compare(pass, user.password_hash);
      
      if (isMatch) {
        const { password_hash, ...result } = user.get({ plain: true });
        return result;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error comparing passwords: ${error.message}`, error.stack);
      return null;
    }
  }

  async validateTenant(email: string, pass: string): Promise<any> {
    const tenant = await this.tenantModel.findOne({
      where: { contactEmail: email }
    });
    
    if (!tenant) {
      return null;
    }
    
    if (!tenant.password_hash) {
      return null;
    }
    
    try {
      const isMatch = await bcrypt.compare(pass, tenant.password_hash);
      
      if (isMatch) {
        const { password_hash, ...result } = tenant.get({ plain: true });
        return { 
          ...result, 
          role: 'tenant', 
          email: tenant.contactEmail,
          name: tenant.name
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Error comparing tenant passwords: ${error.message}`, error.stack);
      return null;
    }
  }

  async login(loginUserDto: LoginUserDto) {
    // Try to validate as a user first
    let user = await this.validateUser(loginUserDto.email, loginUserDto.password);
    let isTenant = false;
    
    // If user validation fails, try tenant validation with email as username
    if (!user) {
      user = await this.validateTenant(loginUserDto.email, loginUserDto.password);
      isTenant = true;
    }
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // For tenant login, skip 2FA for now and login directly
    if (isTenant) {
      const payload = { 
        email: user.email, 
        sub: user.id, 
        role: user.role,
        name: user.name,
        tenantId: user.id 
      };
      const access_token = this.jwtService.sign(payload);

      this.logger.log(`Tenant ${user.email} logged in successfully`);
      console.log('Tenant login response user object:', user);
      console.log('Tenant login JWT payload:', payload);

      return {
        access_token,
        user: user,
        message: 'Tenant login successful',
        requiresOTP: false,
      };
    }

    // Check if 2FA is enabled for this user
    if (!user.twoFactorEnabled) {
      // Direct login without 2FA
      const payload = { email: user.email, sub: user.id, role: user.role };
      const access_token = this.jwtService.sign(payload);

      // Send login success notification
      await this.emailsService.sendEmail({
        to: user.email,
        subject: 'Login Alert - Banking Web Platform',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Login Alert</h2>
            <p>Hello ${user.name || user.email},</p>
            <p>Your account was accessed on ${new Date().toLocaleString()}.</p>
            <p>If this wasn't you, please contact support immediately.</p>
            <p>Best regards,<br>Banking Web Platform Team</p>
          </div>
        `
      });

      const { password_hash, ...userResult } = user;

      this.logger.log(`User ${user.email} logged in successfully without 2FA`);

      return {
        access_token,
        user: userResult,
        message: 'Login successful',
        requiresOTP: false,
      };
    }

    // Send OTP for 2FA
    const otpResult = await this.otpService.sendOTP(user.email, user.name || user.email, 'login');
    
    if (!otpResult.success) {
      throw new UnauthorizedException('Failed to send verification code. Please try again.');
    }

    return {
      requiresOTP: true,
      message: 'Verification code sent to your email. Please enter the code to complete login.',
      email: user.email,
      tempUserId: user.id, // Temporary identifier for OTP verification
    };
  }

  async verifyLoginOTP(email: string, otp: string, tempUserId: number) {
    // Verify OTP
    const otpResult = await this.otpService.verifyOTP(email, otp, 'login');
    
    if (!otpResult.success) {
      throw new UnauthorizedException(otpResult.message);
    }

    // Get user details
    const user = await this.usersService.findOne(tempUserId);
    if (!user || user.email !== email) {
      throw new UnauthorizedException('Invalid verification attempt');
    }

    // Generate JWT token
    const payload = { email: user.email, sub: user.id, role: user.role };
    const access_token = this.jwtService.sign(payload);

    // Send login success notification
    await this.emailsService.sendEmail({
      to: user.email,
      subject: 'Login Alert - Banking Web Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Login Alert</h2>
          <p>Hello ${user.name || user.email},</p>
          <p>Your account was accessed on ${new Date().toLocaleString()}.</p>
          <p>If this wasn't you, please contact support immediately.</p>
          <p>Best regards,<br>Banking Web Platform Team</p>
        </div>
      `
    });

    const { password_hash, ...userResult } = user.get({ plain: true });

    this.logger.log(`User ${user.email} logged in successfully with 2FA`);

    return {
      access_token,
      user: userResult,
      message: 'Login successful',
    };
  }

  async resendOTP(email: string) {
    // Find user by email
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Send new OTP
    const otpResult = await this.otpService.sendOTP(user.email, user.name || user.email, 'login');
    
    if (!otpResult.success) {
      throw new UnauthorizedException('Failed to send verification code. Please try again.');
    }

    return {
      success: true,
      message: otpResult.message,
    };
  }

  async enable2FA(userId: number, password: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return {
        success: true,
        requiresOTP: false,
        message: '2FA is already enabled for your account.',
      };
    }

    // Verify password before enabling 2FA
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Send OTP to verify email before enabling 2FA
    const otpResult = await this.otpService.sendOTP(user.email, user.name || user.email, '2fa-enable');
    
    if (!otpResult.success) {
      throw new UnauthorizedException('Failed to send verification code. Please try again.');
    }

    return {
      success: true,
      requiresOTP: true,
      message: 'Verification code sent to your email. Please enter the code to enable 2FA.',
      email: user.email,
    };
  }

  async confirm2FAEnable(userId: number, otp: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify OTP
    const otpResult = await this.otpService.verifyOTP(user.email, otp, '2fa-enable');
    
    if (!otpResult.success) {
      throw new UnauthorizedException(otpResult.message);
    }

    // Enable 2FA for the user
    await this.usersService.update2FAStatus(userId, true);

    this.logger.log(`2FA enabled for user ${user.email}`);

    return {
      success: true,
      message: '2FA has been successfully enabled for your account.',
    };
  }

  async disable2FA(userId: number, password: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password before disabling 2FA
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // If 2FA is enabled, require OTP verification
    if (user.twoFactorEnabled) {
      const otpResult = await this.otpService.sendOTP(user.email, user.name || user.email, '2fa-disable');
      
      if (!otpResult.success) {
        throw new UnauthorizedException('Failed to send verification code. Please try again.');
      }

      return {
        success: true,
        requiresOTP: true,
        message: 'Verification code sent to your email. Please enter the code to disable 2FA.',
        email: user.email,
      };
    }

    return {
      success: true,
      requiresOTP: false,
      message: '2FA is already disabled for your account.',
    };
  }

  async confirm2FADisable(userId: number, otp: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify OTP
    const otpResult = await this.otpService.verifyOTP(user.email, otp, '2fa-disable');
    
    if (!otpResult.success) {
      throw new UnauthorizedException(otpResult.message);
    }

    // Disable 2FA for the user
    await this.usersService.update2FAStatus(userId, false);

    this.logger.log(`2FA disabled for user ${user.email}`);

    return {
      success: true,
      message: '2FA has been successfully disabled for your account.',
    };
  }
} 