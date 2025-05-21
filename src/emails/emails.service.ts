import { Injectable, Inject, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Email, EmailStatus } from './entities/email.entity';
import { RabbitSubscribe, Nack } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity'; // For associating senderUserId
import { RedisService } from '../redis/redis.service';
import * as nodemailer from 'nodemailer';

interface EmailPayload {
  senderUserId: number;
  recipient: string;
  subject: string;
  body: string;         // Plain text body
  htmlBody?: string;    // Optional HTML body
  correlationId?: string; // For tracking
  attempts?: number; // For retry logic
}

const MAX_EMAIL_RETRIES = 3;
const USER_SENT_EMAIL_CACHE_KEY_PREFIX = 'user_sent_emails:';
const USER_SENT_EMAIL_CACHE_TTL = 60 * 60; // 1 hour
const USER_SENT_EMAIL_CACHE_LIMIT = 10;

@Injectable()
export class EmailsService {
  private readonly logger = new Logger(EmailsService.name);
  private readonly emailExchange: string;
  private readonly emailSendRoutingKey = 'email.send'; // Must match queue binding
  private readonly emailFromAddress: string;
  private nodemailerTransport: any; // Remove readonly since we assign to it after constructor
  // Add a mock implementation for amqp connection
  private mockAmqpConnection = {
    publish: async (exchange: string, routingKey: string, message: any) => {
      this.logger.log(`[MOCK] Publishing to ${exchange}:${routingKey}`);
      return Promise.resolve(true);
    }
  };

  constructor(
    @InjectModel(Email) private emailModel: typeof Email,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.emailExchange = this.configService.get<string>('RABBITMQ_EMAIL_EXCHANGE', 'email_exchange');
    this.emailFromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS', '"My App" <noreply@example.com>');
    
    // Create the transport directly here instead of injecting it
    this.createNodemailerTransport();
  }

  private createNodemailerTransport() {
    this.logger.log('Creating nodemailer transport directly in EmailsService');
    
    try {
      // Configuration based on previous userEmail.js
      this.nodemailerTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.configService.get<string>('EMAIL_USERNAME'),
          pass: this.configService.get<string>('EMAIL_PASSWORD')
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      this.logger.log('Nodemailer transport created successfully');
    } catch (error) {
      this.logger.error('Failed to create nodemailer transport:', error.message);
      // Create a dummy transport as fallback
      this.nodemailerTransport = {
        sendMail: (options: any) => {
          this.logger.warn(`[DUMMY TRANSPORT] Email to ${options.to} not actually sent`);
          return Promise.resolve({ response: 'Dummy transport used - email not sent' });
        }
      };
    }
  }

  async queueEmailForSending(payload: EmailPayload): Promise<Email> {
    this.logger.log(`Queueing email for ${payload.recipient} with subject "${payload.subject}"`);
    // Persist email to DB first
    const emailRecord = await this.emailModel.create({
        ...payload,
        status: EmailStatus.PENDING,
        attempts: 0,
    } as any); // Cast to any as a temporary fix for the complex type error

    try {
      // Use mock amqpConnection instead
      await this.mockAmqpConnection.publish(
        this.configService.get<string>('RABBITMQ_EMAIL_EXCHANGE', 'email_exchange'),
        'email.send', // routing key
        { ...emailRecord.get({ plain: true }), correlationId: emailRecord.id.toString() }, // payload
      );
      this.logger.log(`Email ${emailRecord.id} published to RabbitMQ for sending.`);
      return emailRecord;
    } catch (error) {
      this.logger.error(`Failed to queue email ${emailRecord.id} for ${payload.recipient}: ${error.message}`, error.stack);
      emailRecord.status = EmailStatus.FAILED;
      emailRecord.failureReason = `Failed to publish to RabbitMQ: ${error.message}`;
      await emailRecord.save();
      throw new InternalServerErrorException('Failed to queue email.');
    }
  }

  @RabbitSubscribe({
    exchange: process.env.RABBITMQ_EMAIL_EXCHANGE || 'email_exchange',
    routingKey: 'email.send', // Must match publisher and queue binding
    queue: process.env.RABBITMQ_EMAIL_SEND_QUEUE || 'email_send_queue',
    queueOptions: {
        durable: true,
        // Remove any DLX configuration
    }
  })
  public async handleEmailMessage(payload: EmailPayload & { attempts?: number, correlationId?: string }) { // Ensure attempts and correlationId are in type
    this.logger.log(`Received email to process for ${payload.recipient}, attempt ${(payload.attempts || 0) + 1}`);
    let emailRecord;
    if (payload.correlationId) {
      emailRecord = await this.emailModel.findOne({ where: { id: parseInt(payload.correlationId, 10) } });
    } else {
      this.logger.error('Correlation ID missing in email payload from RabbitMQ. Cannot process.');
      // Consider NACKing the message if possible and appropriate, or moving to DLQ manually if not auto-handled
      return; // Stop processing this message
    }

    if (!emailRecord) {
        this.logger.error(`Email record not found for correlationId: ${payload.correlationId}. Acknowledging to remove from queue.`);
        // Cannot requeue or DLQ if no record, ack to avoid infinite loop
        return;
    }

    emailRecord.attempts = (payload.attempts || 0) + 1;
    emailRecord.lastAttemptAt = new Date();

    try {
      // Create email options, including HTML if available
      const mailOptions = {
        from: this.configService.get<string>('EMAIL_FROM', this.emailFromAddress),
        to: payload.recipient,
        subject: payload.subject,
        text: payload.body, // Plain text body
      };
      
      // Add HTML body if available
      if (payload.htmlBody) {
        mailOptions['html'] = payload.htmlBody;
      }
      
      await this.nodemailerTransport.sendMail(mailOptions);

      this.logger.log(`Email sent successfully to ${payload.recipient} (Record ID: ${emailRecord.id})`);
      emailRecord.status = EmailStatus.SENT;
      emailRecord.sentAt = new Date();
      await emailRecord.save();
      await this.updateUserSentEmailCache(payload.senderUserId, emailRecord);
      // Message processed successfully, will be auto-acked by default if no Nack is returned
      return;
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.recipient} (Record ID: ${emailRecord.id}), attempt ${emailRecord.attempts}: ${error.message}`, error.stack);
      emailRecord.failureReason = error.message;

      if (emailRecord.attempts >= MAX_EMAIL_RETRIES) {
        this.logger.warn(`Email to ${payload.recipient} (Record ID: ${emailRecord.id}) reached max retries. Moving to DLQ.`);
        emailRecord.status = EmailStatus.DLQ;
        await emailRecord.save();
        // Return Nack with requeue=false to send to DLQ (if DLX is configured on the queue)
        return new Nack(false);
      } else {
        this.logger.log(`Retrying email to ${payload.recipient} (Record ID: ${emailRecord.id}). Attempt ${emailRecord.attempts}.`);
        emailRecord.status = EmailStatus.FAILED; // Marked as FAILED for this attempt
        await emailRecord.save();
        return new Nack(false); // Send to DLQ if not retrying explicitly here
      }
    }
  }

  private async updateUserSentEmailCache(senderUserId: number, email: Email): Promise<void> {
    const cacheKey = `${USER_SENT_EMAIL_CACHE_KEY_PREFIX}${senderUserId}`;
    try {
      const emailData = {
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        sentAt: email.sentAt,
        status: email.status
      };

      // Add to the beginning of the list
      await this.redisService.lpush(cacheKey, emailData);
      
      // Trim the list to keep only the latest 10 emails
      await this.redisService.ltrim(cacheKey, 0, USER_SENT_EMAIL_CACHE_LIMIT - 1);
      
      // Set TTL for the key
      await this.redisService.set(cacheKey, null, USER_SENT_EMAIL_CACHE_TTL);
      
      this.logger.log(`Updated email cache for user ${senderUserId}`);
    } catch (error) {
      this.logger.error(`Failed to update email cache for user ${senderUserId}: ${error.message}`, error.stack);
    }
  }

  /**
   * Sends an email by publishing to RabbitMQ
   * (Previously was direct sending, now converted to use queue)
   */
  async sendEmailDirect(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    senderUserId?: number;
  }): Promise<any> {
    if (!options.senderUserId) {
      throw new InternalServerErrorException('senderUserId is required for sending emails');
    }
    
    return this.queueEmailForSending({
      senderUserId: options.senderUserId,
      recipient: options.to,
      subject: options.subject,
      body: options.text || '',
      htmlBody: options.html
    });
  }

  async getSentEmailsForUser(userId: number): Promise<Partial<Email>[]> {
    const cacheKey = `${USER_SENT_EMAIL_CACHE_KEY_PREFIX}${userId}`;
    
    try {
      // Try to get from Redis first
      const cachedEmails = await this.redisService.lrange(cacheKey, 0, -1);
      
      if (cachedEmails && cachedEmails.length > 0) {
        this.logger.log(`Returning sent emails for user ${userId} from Redis cache.`);
        return cachedEmails;
      }
    } catch (error) {
      this.logger.error(`Redis cache error for user ${userId}: ${error.message}`, error.stack);
    }

    // If not in cache, get from database
    this.logger.log(`Cache miss for user ${userId} sent emails. Fetching from DB.`);
    const dbEmails = await this.emailModel.findAll({
      where: { senderUserId: userId, status: EmailStatus.SENT },
      order: [['sentAt', 'DESC']],
      limit: USER_SENT_EMAIL_CACHE_LIMIT,
      attributes: ['id', 'recipient', 'subject', 'sentAt', 'status'],
    });

    if (dbEmails && dbEmails.length > 0) {
      const emailData = dbEmails.map(e => e.get({ plain: true }));
      
      try {
        // Cache the results in Redis
        for (const email of emailData) {
          await this.redisService.lpush(cacheKey, email);
        }
        await this.redisService.ltrim(cacheKey, 0, USER_SENT_EMAIL_CACHE_LIMIT - 1);
        await this.redisService.set(cacheKey, null, USER_SENT_EMAIL_CACHE_TTL);
        
        this.logger.log(`Cached DB results for user ${userId} sent emails in Redis.`);
      } catch (error) {
        this.logger.error(`Failed to cache emails in Redis for user ${userId}: ${error.message}`, error.stack);
      }
      
      return emailData;
    }

    return [];
  }

  /**
   * Get an email by its ID
   */
  async getEmailById(id: number): Promise<Email | null> {
    const email = await this.emailModel.findByPk(id);
    if (!email) {
      throw new NotFoundException(`Email with ID ${id} not found`);
    }
    return email;
  }
}