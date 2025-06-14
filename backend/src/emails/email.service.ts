import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Debug logging to check environment variables
    const emailUser = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    
    this.logger.log(`Email User: ${emailUser || 'NOT SET'}`);
    this.logger.log(`Email Pass: ${emailPass ? 'SET (length: ' + emailPass.length + ')' : 'NOT SET'}`);
    
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Use service instead of host/port for Gmail
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      // Additional options for better compatibility
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test the connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Email transporter verification failed:', error);
      } else {
        this.logger.log('Email transporter is ready to send emails');
      }
    });
  }

  async sendOTP(email: string, otp: string, userName: string): Promise<boolean> {
    try {
      const emailUser = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
      const mailOptions = {
        from: `"Banking App Security" <${emailUser || 'your-email@gmail.com'}>`,
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
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                <p style="color: #856404; margin: 0; font-size: 14px;">
                  ⚠️ <strong>Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you didn't attempt to log in, please ignore this email or contact our support team immediately.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                This is an automated message from Banking App Security System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}:`, error);
      return false;
    }
  }

  async sendLoginAlert(email: string, userName: string, loginTime: Date, ipAddress?: string): Promise<boolean> {
    try {
      const emailUser = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
      const mailOptions = {
        from: `"Banking App Security" <${emailUser || 'your-email@gmail.com'}>`,
        to: email,
        subject: 'Successful Login Alert',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✅ Login Successful</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName}!</h2>
              
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Your account was successfully accessed. Here are the login details:
              </p>
              
              <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 10px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #16a34a; margin: 0 0 15px 0;">Login Information</h3>
                <p style="margin: 5px 0; color: #333;"><strong>Time:</strong> ${loginTime.toLocaleString()}</p>
                ${ipAddress ? `<p style="margin: 5px 0; color: #333;"><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
                <p style="margin: 5px 0; color: #333;"><strong>Device:</strong> Web Browser</p>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  🛡️ If this wasn't you, please contact our support team immediately and change your password.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                This is an automated security notification from Banking App.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Login alert sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send login alert to ${email}:`, error);
      return false;
    }
  }
} 