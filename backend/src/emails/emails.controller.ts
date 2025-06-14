import { Controller, UseGuards, Req, Logger, Post, Body, Get, Param, NotFoundException } from '@nestjs/common';
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
    this.logger.log(`User ${req.user.userId} sending email to ${sendEmailDto.recipient}`);
    
    const emailPayload = {
      senderUserId: req.user.userId,
      recipient: sendEmailDto.recipient,
      subject: sendEmailDto.subject,
      body: sendEmailDto.body,
      htmlBody: sendEmailDto.htmlBody,
    };
    
    return this.emailsService.queueEmailForSending(emailPayload);
  }

  /**
   * Endpoint to get user's sent emails
   */
  @Get('sent')
  @UseGuards(JwtAuthGuard)
  async getSentEmails(@Req() req) {
    this.logger.log(`User ${req.user.userId} fetching sent emails`);
    return this.emailsService.getSentEmailsForUser(req.user.userId);
  }

  /**
   * Endpoint to check email status
   */
  @Get('status/:id')
  @UseGuards(JwtAuthGuard)
  async getEmailStatus(@Req() req, @Param('id') id: string) {
    this.logger.log(`User ${req.user.userId} checking status of email ${id}`);
    
    const email = await this.emailsService.getEmailById(parseInt(id, 10));
    
    if (!email) {
      throw new NotFoundException(`Email with ID ${id} not found`);
    }
    
    // Check if the user is authorized to view this email
    if (email.senderUserId !== req.user.userId) {
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
