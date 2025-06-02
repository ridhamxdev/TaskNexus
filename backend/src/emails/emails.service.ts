import { Injectable, Inject, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Email, EmailStatus } from './entities/email.entity';
import { RabbitSubscribe, Nack, AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity'; 
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// Import nodemailer directly
import * as nodemailer from 'nodemailer';

interface EmailPayload {
  senderUserId: number;
  recipient: string;
  subject: string;
  body: string;         
  htmlBody?: string;    
  correlationId?: string; 
  attempts?: number; 
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

  constructor(
    @InjectModel(Email) private emailModel: typeof Email,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly amqpConnection: AmqpConnection,
  ) {
    this.emailExchange = this.configService.get<string>('RABBITMQ_EMAIL_EXCHANGE', 'email_exchange');
    this.emailFromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS', '"Teams2 App" <ridhamgoyal3@gmail.com>');
    
    // Create the transport directly here instead of injecting it
    this.createNodemailerTransport();
  }

  private createNodemailerTransport() {
    this.logger.log('Creating nodemailer transport');
    
    try {
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
      throw new InternalServerErrorException('Failed to initialize email service');
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
      await this.amqpConnection.publish(
        this.emailExchange,
        this.emailSendRoutingKey,
        { ...emailRecord.get({ plain: true }), correlationId: emailRecord.id.toString() }
      );
      this.logger.log(`Email ${emailRecord.id} published to RabbitMQ for sending.`);
      return emailRecord;
    } catch (error) {
      this.logger.error(`Failed to queue email ${emailRecord.id}: ${error.message}`, error.stack);
      emailRecord.status = EmailStatus.FAILED;
      emailRecord.failureReason = `Failed to publish to RabbitMQ: ${error.message}`;
      await emailRecord.save();
      throw new InternalServerErrorException('Failed to queue email.');
    }
  }

  @RabbitSubscribe({
    exchange: 'email_exchange',
    routingKey: 'email.send',
    queue: 'email_send_queue',
    queueOptions: {
      durable: true,
    }
  })
  public async handleEmailMessage(payload: EmailPayload & { attempts?: number, correlationId?: string }) {
    this.logger.log(`Processing email for ${payload.recipient}, attempt ${(payload.attempts || 0) + 1}`);
    
    let emailRecord;
    if (payload.correlationId) {
      emailRecord = await this.emailModel.findOne({ where: { id: parseInt(payload.correlationId, 10) } });
    } else {
      this.logger.error('Correlation ID missing in email payload');
      return;
    }

    if (!emailRecord) {
      this.logger.error(`Email record not found for correlationId: ${payload.correlationId}`);
      return;
    }

    emailRecord.attempts = (payload.attempts || 0) + 1;
    emailRecord.lastAttemptAt = new Date();

    try {
      const mailOptions = {
        from: this.emailFromAddress,
        to: payload.recipient,
        subject: payload.subject,
        text: payload.body,
        html: payload.htmlBody
      };
      
      await this.nodemailerTransport.sendMail(mailOptions);

      this.logger.log(`Email sent successfully to ${payload.recipient} (ID: ${emailRecord.id})`);
      emailRecord.status = EmailStatus.SENT;
      emailRecord.sentAt = new Date();
      await emailRecord.save();
      await this.updateUserSentEmailCache(payload.senderUserId, emailRecord);
      return;
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.recipient}: ${error.message}`);
      emailRecord.failureReason = error.message;

      if (emailRecord.attempts >= MAX_EMAIL_RETRIES) {
        emailRecord.status = EmailStatus.FAILED;
        await emailRecord.save();
        return new Nack(false);
      } else {
        emailRecord.status = EmailStatus.PENDING;
        await emailRecord.save();
        return new Nack(true); // Retry the message
      }
    }
  }

  private async updateUserSentEmailCache(senderUserId: number, email: Email): Promise<void> {
    const cacheKey = `${USER_SENT_EMAIL_CACHE_KEY_PREFIX}${senderUserId}`;
    try {
      let cachedEmails: Partial<Email>[] = await this.cacheManager.get(cacheKey) || [];
      const newEmailEntry = { 
        id: email.id,
        recipient: email.recipient,
        subject: email.subject,
        sentAt: email.sentAt,
        status: email.status 
      };
      cachedEmails.unshift(newEmailEntry); // Add to the beginning
      cachedEmails = cachedEmails.slice(0, USER_SENT_EMAIL_CACHE_LIMIT); // Keep only the limit
      await this.cacheManager.set(cacheKey, cachedEmails, USER_SENT_EMAIL_CACHE_TTL);
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
    const cacheKey = `sent_emails_user_${userId}`;
    try {
      const cachedEmails: Partial<Email>[] = await this.cacheManager.get(cacheKey) || [];
      if (cachedEmails.length > 0) {
        this.logger.log(`Returning sent emails for user ${userId} from cache.`);
        return cachedEmails;
      }
    } catch (error) {
        this.logger.error(`Redis cache error for user ${userId}: ${error.message}`, error.stack);
        // Fall through to DB if cache fails
    }

    this.logger.log(`Cache miss for user ${userId} sent emails. Fetching from DB.`);
    const dbEmails = await this.emailModel.findAll({
      where: { senderUserId: userId, status: EmailStatus.SENT },
      order: [['sentAt', 'DESC']],
      limit: USER_SENT_EMAIL_CACHE_LIMIT,
      attributes: ['id', 'recipient', 'subject', 'sentAt', 'status'],
    });

    if (dbEmails && dbEmails.length > 0) {
      try {
        await this.cacheManager.set(cacheKey, dbEmails.map(e => e.get({ plain: true })), USER_SENT_EMAIL_CACHE_TTL);
        this.logger.log(`Cached DB results for user ${userId} sent emails.`);
      } catch (error) {
        this.logger.error(`Failed to set cache for user ${userId} after DB fetch: ${error.message}`, error.stack);
      }
    }
    return dbEmails.map(e => e.get({ plain: true }));
  }

  /**
   * Get an email by its ID
   */
  async getEmailById(id: number): Promise<Email | null> {
    return this.emailModel.findByPk(id);
  }
}