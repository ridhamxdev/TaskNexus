import { Controller, UseGuards, Req, Logger, Post, Body, Get, Param, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendEmailDto } from './dto/send-email.dto';

@Controller('emails')
export class EmailsController {
  private readonly logger = new Logger(EmailsController.name);
  
  constructor(private readonly emailsService: EmailsService) {}

  /**
   * Email sending endpoint that publishes to RabbitMQ queue
   */
  @Post('send-direct')
  @UseGuards(JwtAuthGuard)
  async sendDirectEmail(@Req() req, @Body() sendEmailDto: SendEmailDto) {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} sending email to ${sendEmailDto.recipient}`);
    
    if (!userId) {
      this.logger.error('No user ID in request');
      throw new UnauthorizedException('User not authenticated');
    }
    
    const emailPayload = {
      senderUserId: userId,
      recipient: sendEmailDto.recipient,
      subject: sendEmailDto.subject,
      body: sendEmailDto.body,
      htmlBody: sendEmailDto.htmlBody,
    };
    
    return this.emailsService.queueEmailForSending(emailPayload);
  }

  @Get('sent')
  @UseGuards(JwtAuthGuard)
  async getSentEmails(@Req() req) {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} fetching sent emails`);
    
    if (!userId) {
      this.logger.error('No user ID in request');
      throw new UnauthorizedException('User not authenticated');
    }
    
    return this.emailsService.getSentEmailsForUser(userId);
  }

  /**
   * Endpoint to check email status
   */
  @Get('status/:id')
  @UseGuards(JwtAuthGuard)
  async getEmailStatus(@Req() req, @Param('id') id: string) {
    const userId = req.user.userId;
    this.logger.log(`User ${userId} checking status of email ${id}`);
    
    if (!userId) {
      this.logger.error('No user ID in request');
      throw new UnauthorizedException('User not authenticated');
    }
    
    const email = await this.emailsService.getEmailById(parseInt(id, 10));
    
    if (!email) {
      this.logger.warn(`Email not found: ${id}`);
      throw new NotFoundException(`Email with ID ${id} not found`);
    }
    
    // Check if the user is authorized to view this email
    if (email.senderUserId !== userId) {
      this.logger.warn(`Unauthorized access attempt: User ${userId} tried to access email ${id}`);
      throw new NotFoundException(`Email with ID ${id} not found`);
    }
    
    return {
      id: email.id,
      recipient: email.recipient,
      subject: email.subject,
      status: email.status,
      sentAt: email.sentAt,
      attempts: email.attempts,
      failureReason: email.failureReason
    };
  }
}
