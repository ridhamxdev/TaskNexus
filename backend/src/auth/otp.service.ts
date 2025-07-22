import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OTP } from './entities/otp.entity';
import { EmailsService } from '../emails/emails.service';
import { Op } from 'sequelize';

@Injectable()
export class OTPService {
  private readonly logger = new Logger(OTPService.name);

  constructor(
    @InjectModel(OTP)
    private otpModel: typeof OTP,
    private emailsService: EmailsService,
  ) {}

  /**
   * Generate a 6-digit OTP code
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to user's email
   */
  async sendOTP(email: string, userName: string, purpose: string = 'login'): Promise<{ success: boolean; message: string }> {
    try {
      // Clean up expired OTPs for this email
      await this.cleanupExpiredOTPs(email);

      // Check if there's a recent OTP (within 1 minute) to prevent spam
      const recentOTP = await this.otpModel.findOne({
        where: {
          email,
          purpose,
          isUsed: false,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 60000), // 1 minute ago
          },
        },
      });

      if (recentOTP) {
        return {
          success: false,
          message: 'Please wait 1 minute before requesting a new OTP',
        };
      }

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      // Save OTP to database
      await this.otpModel.create({
        email,
        otp,
        expiresAt,
        purpose,
        isUsed: false,
      } as any);

      // Send OTP via email
      const emailSent = await this.emailsService.sendEmail({
        to: email,
        subject: 'Your Login Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Login Verification</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName}!</h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  We received a login attempt for your account. To complete the login process, please use the verification code below:
                </p>
                
                <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 25px 0;">
                  <h3 style="color: #667eea; margin: 0 0 10px 0;">Your Verification Code</h3>
                  <div style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                    ${otp}
                  </div>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
                  This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    Banking Web Platform Security Team
                  </p>
                </div>
              </div>
            </div>
          `
        });

      if (emailSent) {
        this.logger.log(`OTP sent successfully to ${email} for ${purpose}`);
        return {
          success: true,
          message: 'OTP sent successfully to your email',
        };
      } else {
        return {
          success: false,
          message: 'Failed to send OTP. Please try again.',
        };
      }
    } catch (error) {
      this.logger.error(`Error sending OTP to ${email}:`, error);
      return {
        success: false,
        message: 'An error occurred while sending OTP',
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, otp: string, purpose: string = 'login'): Promise<{ success: boolean; message: string }> {
    try {
      // Find valid OTP
      const otpRecord = await this.otpModel.findOne({
        where: {
          email,
          otp,
          purpose,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date(), // Not expired
          },
        },
      });

      if (!otpRecord) {
        return {
          success: false,
          message: 'Invalid or expired OTP',
        };
      }

      // Mark OTP as used
      await otpRecord.update({ isUsed: true });

      this.logger.log(`OTP verified successfully for ${email}`);
      return {
        success: true,
        message: 'OTP verified successfully',
      };
    } catch (error) {
      this.logger.error(`Error verifying OTP for ${email}:`, error);
      return {
        success: false,
        message: 'An error occurred while verifying OTP',
      };
    }
  }

  /**
   * Clean up expired OTPs
   */
  async cleanupExpiredOTPs(email?: string): Promise<void> {
    try {
      const whereClause: any = {
        [Op.or]: [
          { expiresAt: { [Op.lt]: new Date() } }, // Expired
          { isUsed: true }, // Already used
        ],
      };

      if (email) {
        whereClause.email = email;
      }

      await this.otpModel.destroy({
        where: whereClause,
      });

      this.logger.log(`Cleaned up expired OTPs${email ? ` for ${email}` : ''}`);
    } catch (error) {
      this.logger.error('Error cleaning up expired OTPs:', error);
    }
  }

  /**
   * Get OTP statistics for monitoring
   */
  async getOTPStats(): Promise<any> {
    try {
      const total = await this.otpModel.count();
      const active = await this.otpModel.count({
        where: {
          isUsed: false,
          expiresAt: { [Op.gt]: new Date() },
        },
      });
      const expired = await this.otpModel.count({
        where: {
          expiresAt: { [Op.lt]: new Date() },
        },
      });

      return { total, active, expired };
    } catch (error) {
      this.logger.error('Error getting OTP stats:', error);
      return { total: 0, active: 0, expired: 0 };
    }
  }
} 