import { Injectable } from '@nestjs/common';
import { EmailsService } from './emails.service';

@Injectable()
export class EmailUtils {
  constructor(private readonly emailsService: EmailsService) {}

  /**
   * Send an email by publishing to RabbitMQ queue
   * This replaces the direct sending method with queue-based approach
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    senderUserId: number;
  }): Promise<any> {
    return this.emailsService.queueEmailForSending({
      senderUserId: options.senderUserId,
      recipient: options.to,
      subject: options.subject,
      body: options.text || '',
      htmlBody: options.html
    });
  }

  /**
   * Queue an email for sending via RabbitMQ
   */
  async queueEmail(options: {
    senderUserId: number;
    recipient: string;
    subject: string;
    body: string;
    htmlBody?: string;
  }): Promise<any> {
    return this.emailsService.queueEmailForSending(options);
  }
} 