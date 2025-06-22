import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';
import { EmailsService } from '../emails/emails.service';
import { SubscriptionStatus, UserSubscription } from './entities/user-subscription.entity';
import { CronJob } from 'cron';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private subscriptionsService: SubscriptionsService,
    private emailService: EmailsService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  // Run daily at 2 AM to process subscription renewals
  @Cron('0 2 * * *', {
    name: 'subscription-renewal',
    timeZone: 'UTC',
  })
  async handleSubscriptionRenewals(): Promise<void> {
    this.logger.log('Starting subscription renewal process...');

    try {
      const subscriptionsForRenewal = await this.subscriptionsService.getSubscriptionsForRenewal();
      
      if (subscriptionsForRenewal.length === 0) {
        this.logger.log('No subscriptions due for renewal');
        return;
      }

      this.logger.log(`Processing ${subscriptionsForRenewal.length} subscriptions for renewal`);

      let successCount = 0;
      let failureCount = 0;

      for (const subscription of subscriptionsForRenewal) {
        try {
          const renewed = await this.subscriptionsService.renewSubscription(subscription);
          
          if (renewed) {
            successCount++;
            await this.sendRenewalSuccessEmail(subscription);
          } else {
            failureCount++;
            await this.sendRenewalFailureEmail(subscription);
          }
        } catch (error) {
          failureCount++;
          this.logger.error(`Failed to renew subscription ${subscription.id}:`, error);
          await this.sendRenewalFailureEmail(subscription);
        }
      }

      this.logger.log(`Subscription renewal completed. Success: ${successCount}, Failures: ${failureCount}`);
    } catch (error) {
      this.logger.error('Error in subscription renewal process:', error);
    }
  }

  // Run daily at 1 AM to check for expiring subscriptions and send warnings
  @Cron('0 1 * * *', {
    name: 'subscription-expiry-warnings',
    timeZone: 'UTC',
  })
  async handleExpiryWarnings(): Promise<void> {
    this.logger.log('Checking for expiring subscriptions...');

    try {
      // Check for subscriptions expiring in 7 days
      const expiringIn7Days = await this.subscriptionsService.getExpiringSubscriptions(7);
      
      // Check for subscriptions expiring in 3 days
      const expiringIn3Days = await this.subscriptionsService.getExpiringSubscriptions(3);
      
      // Check for subscriptions expiring in 1 day
      const expiringIn1Day = await this.subscriptionsService.getExpiringSubscriptions(1);

      if (expiringIn7Days.length > 0) {
        this.logger.log(`Found ${expiringIn7Days.length} subscriptions expiring in 7 days`);
        for (const subscription of expiringIn7Days) {
          await this.sendExpiryWarningEmail(subscription, 7);
        }
      }

      if (expiringIn3Days.length > 0) {
        this.logger.log(`Found ${expiringIn3Days.length} subscriptions expiring in 3 days`);
        for (const subscription of expiringIn3Days) {
          await this.sendExpiryWarningEmail(subscription, 3);
        }
      }

      if (expiringIn1Day.length > 0) {
        this.logger.log(`Found ${expiringIn1Day.length} subscriptions expiring in 1 day`);
        for (const subscription of expiringIn1Day) {
          await this.sendExpiryWarningEmail(subscription, 1);
        }
      }

    } catch (error) {
      this.logger.error('Error checking expiring subscriptions:', error);
    }
  }

  // Run daily at 3 AM to clean up expired subscriptions
  @Cron('0 3 * * *', {
    name: 'subscription-cleanup',
    timeZone: 'UTC',
  })
  async handleExpiredSubscriptions(): Promise<void> {
    this.logger.log('Starting expired subscription cleanup...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find subscriptions that have expired
      const expiredSubscriptions = await this.subscriptionsService.userSubscriptionModel.findAll({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: {
            [require('sequelize').Op.lt]: today,
          },
        },
        include: [
          { model: this.subscriptionsService.userModel, as: 'user' },
          { model: this.subscriptionsService.subscriptionPlanModel, as: 'plan' },
        ],
      });

      if (expiredSubscriptions.length === 0) {
        this.logger.log('No expired subscriptions found');
        return;
      }

      this.logger.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

      for (const subscription of expiredSubscriptions) {
        try {
          // Update subscription status
          subscription.status = SubscriptionStatus.EXPIRED;
          await subscription.save();

          // Send expiry notification
          await this.sendSubscriptionExpiredEmail(subscription);

          this.logger.log(`Marked subscription ${subscription.id} as expired`);
        } catch (error) {
          this.logger.error(`Failed to mark subscription ${subscription.id} as expired:`, error);
        }
      }

      this.logger.log(`Expired subscription cleanup completed`);
    } catch (error) {
      this.logger.error('Error in expired subscription cleanup:', error);
    }
  }

  // Run weekly on Sundays at 4 AM to reset usage counters for monthly plans
  @Cron('0 4 * * 0', {
    name: 'monthly-usage-reset',
    timeZone: 'UTC',
  })
  async handleMonthlyUsageReset(): Promise<void> {
    this.logger.log('Starting monthly usage counter reset...');

    try {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const lastDayOfPreviousMonth = new Date(firstDayOfMonth);
      lastDayOfPreviousMonth.setDate(0);

      // Reset usage counters for subscriptions that started in the current month
      const subscriptionsToReset = await this.subscriptionsService.userSubscriptionModel.findAll({
        where: {
          status: SubscriptionStatus.ACTIVE,
          startDate: {
            [require('sequelize').Op.gte]: firstDayOfMonth,
          },
        },
        include: [{ model: this.subscriptionsService.subscriptionPlanModel, as: 'plan' }],
      });

      for (const subscription of subscriptionsToReset) {
        if (subscription.plan.billingCycle === 'monthly') {
          subscription.emailsUsed = 0;
          subscription.transactionsUsed = 0;
          await subscription.save();
        }
      }

      this.logger.log(`Reset usage counters for ${subscriptionsToReset.length} monthly subscriptions`);
    } catch (error) {
      this.logger.error('Error resetting monthly usage counters:', error);
    }
  }

  // Run on the 1st of every quarter at 5 AM to reset quarterly subscription usage
  @Cron('0 5 1 */3 *', {
    name: 'quarterly-usage-reset',
    timeZone: 'UTC',
  })
  async handleQuarterlyUsageReset(): Promise<void> {
    this.logger.log('Starting quarterly usage counter reset...');

    try {
      const subscriptionsToReset = await this.subscriptionsService.userSubscriptionModel.findAll({
        where: {
          status: SubscriptionStatus.ACTIVE,
        },
        include: [{ model: this.subscriptionsService.subscriptionPlanModel, as: 'plan' }],
      });

      let resetCount = 0;
      for (const subscription of subscriptionsToReset) {
        if (subscription.plan.billingCycle === 'quarterly') {
          subscription.emailsUsed = 0;
          subscription.transactionsUsed = 0;
          await subscription.save();
          resetCount++;
        }
      }

      this.logger.log(`Reset usage counters for ${resetCount} quarterly subscriptions`);
    } catch (error) {
      this.logger.error('Error resetting quarterly usage counters:', error);
    }
  }

  // Run on January 1st at 6 AM to reset annual subscription usage
  @Cron('0 6 1 1 *', {
    name: 'annual-usage-reset',
    timeZone: 'UTC',
  })
  async handleAnnualUsageReset(): Promise<void> {
    this.logger.log('Starting annual usage counter reset...');

    try {
      const subscriptionsToReset = await this.subscriptionsService.userSubscriptionModel.findAll({
        where: {
          status: SubscriptionStatus.ACTIVE,
        },
        include: [{ model: this.subscriptionsService.subscriptionPlanModel, as: 'plan' }],
      });

      let resetCount = 0;
      for (const subscription of subscriptionsToReset) {
        if (subscription.plan.billingCycle === 'annually') {
          subscription.emailsUsed = 0;
          subscription.transactionsUsed = 0;
          await subscription.save();
          resetCount++;
        }
      }

      this.logger.log(`Reset usage counters for ${resetCount} annual subscriptions`);
    } catch (error) {
      this.logger.error('Error resetting annual usage counters:', error);
    }
  }

  // Email notification methods
  private async sendRenewalSuccessEmail(subscription: any): Promise<void> {
    try {
      const subject = 'Subscription Renewed Successfully';
      const content = `
        <h2>Subscription Renewed</h2>
        <p>Dear ${subscription.user.name},</p>
        <p>Your ${subscription.plan.name} subscription has been successfully renewed.</p>
        <p><strong>New Expiry Date:</strong> ${subscription.endDate.toDateString()}</p>
        <p><strong>Amount Charged:</strong> $${subscription.plan.price}</p>
        <p>Thank you for continuing with our service!</p>
      `;

      await this.emailService.sendEmail({
        to: subscription.user.email,
        subject,
        html: content,
      });
    } catch (error) {
      this.logger.error(`Failed to send renewal success email for subscription ${subscription.id}:`, error);
    }
  }

  private async sendRenewalFailureEmail(subscription: any): Promise<void> {
    try {
      const subject = 'Subscription Renewal Failed';
      const content = `
        <h2>Subscription Renewal Failed</h2>
        <p>Dear ${subscription.user.name},</p>
        <p>We were unable to renew your ${subscription.plan.name} subscription due to insufficient wallet balance.</p>
        <p>Please add funds to your wallet to reactivate your subscription.</p>
        <p><strong>Required Amount:</strong> $${subscription.plan.price}</p>
        <p>Your subscription has been suspended until payment is resolved.</p>
      `;

      await this.emailService.sendEmail({
        to: subscription.user.email,
        subject,
        html: content,
      });
    } catch (error) {
      this.logger.error(`Failed to send renewal failure email for subscription ${subscription.id}:`, error);
    }
  }

  private async sendExpiryWarningEmail(subscription: any, daysRemaining: number): Promise<void> {
    try {
      const subject = `Subscription Expiring in ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}`;
      const content = `
        <h2>Subscription Expiry Warning</h2>
        <p>Dear ${subscription.user.name},</p>
        <p>Your ${subscription.plan.name} subscription will expire in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}.</p>
        <p><strong>Expiry Date:</strong> ${subscription.endDate.toDateString()}</p>
        ${subscription.autoRenew ? 
          `<p>Your subscription is set to auto-renew. Please ensure you have sufficient balance ($${subscription.plan.price}) in your wallet.</p>` :
          `<p>Your subscription is not set to auto-renew. Please renew manually to continue using our services.</p>`
        }
      `;

      await this.emailService.sendEmail({
        to: subscription.user.email,
        subject,
        html: content,
      });
    } catch (error) {
      this.logger.error(`Failed to send expiry warning email for subscription ${subscription.id}:`, error);
    }
  }

  private async sendSubscriptionExpiredEmail(subscription: any): Promise<void> {
    try {
      const subject = 'Subscription Expired';
      const content = `
        <h2>Subscription Expired</h2>
        <p>Dear ${subscription.user.name},</p>
        <p>Your ${subscription.plan.name} subscription has expired.</p>
        <p><strong>Expired On:</strong> ${subscription.endDate.toDateString()}</p>
        <p>To continue using our services, please subscribe to a new plan.</p>
        <p>Thank you for using our service!</p>
      `;

      await this.emailService.sendEmail({
        to: subscription.user.email,
        subject,
        html: content,
      });
    } catch (error) {
      this.logger.error(`Failed to send subscription expired email for subscription ${subscription.id}:`, error);
    }
  }

  // Dynamic cron scheduling methods for Amazon Prime-like experience
  async scheduleSubscriptionRenewal(subscriptionId: number, renewalDate: Date): Promise<void> {
    try {
      // Validate renewal date is in the future
      if (renewalDate <= new Date()) {
        this.logger.warn(`Renewal date ${renewalDate.toISOString()} is in the past for subscription ${subscriptionId}, skipping scheduling`);
        return;
      }

      const jobName = `renewal-${subscriptionId}`;
      
      // Remove existing job if it exists
      try {
        this.schedulerRegistry.deleteCronJob(jobName);
      } catch (error) {
        // Job doesn't exist, which is fine
      }

      // Create cron expression for exact renewal time
      const cronExpression = this.createCronExpression(renewalDate);
      this.logger.debug(`Creating renewal cron job with expression: ${cronExpression} for subscription ${subscriptionId}`);
      
      const job = new CronJob(cronExpression, async () => {
        this.logger.log(`Executing scheduled renewal for subscription ${subscriptionId}`);
        try {
          const subscription = await this.subscriptionsService.getUserSubscriptionById(subscriptionId);
          if (subscription && subscription.status === SubscriptionStatus.ACTIVE && subscription.autoRenew) {
            await this.subscriptionsService.renewSubscription(subscription);
            this.logger.log(`Successfully renewed subscription ${subscriptionId} at exact scheduled time`);
          }
        } catch (error) {
          this.logger.error(`Failed to execute scheduled renewal for subscription ${subscriptionId}:`, error);
        }
        
        // Clean up the job after execution
        try {
          this.schedulerRegistry.deleteCronJob(jobName);
        } catch (error) {
          this.logger.error(`Failed to clean up renewal job ${jobName}:`, error);
        }
      });

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();

      this.logger.log(`Scheduled renewal for subscription ${subscriptionId} at ${renewalDate.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to schedule renewal for subscription ${subscriptionId}:`, error);
    }
  }

  async scheduleExpiryReminder(subscriptionId: number, reminderDate: Date, daysBeforeExpiry: number): Promise<void> {
    try {
      // Validate reminder date is in the future
      if (reminderDate <= new Date()) {
        this.logger.warn(`Reminder date ${reminderDate.toISOString()} is in the past for subscription ${subscriptionId}, skipping scheduling`);
        return;
      }

      const jobName = `reminder-${subscriptionId}-${daysBeforeExpiry}days`;
      
      // Remove existing job if it exists
      try {
        this.schedulerRegistry.deleteCronJob(jobName);
      } catch (error) {
        // Job doesn't exist, which is fine
      }

      const cronExpression = this.createCronExpression(reminderDate);
      this.logger.debug(`Creating reminder cron job with expression: ${cronExpression} for subscription ${subscriptionId}`);
      
      const job = new CronJob(cronExpression, async () => {
        this.logger.log(`Sending ${daysBeforeExpiry}-day expiry reminder for subscription ${subscriptionId}`);
        try {
          const subscription = await this.subscriptionsService.getUserSubscriptionById(subscriptionId);
          if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
            await this.sendExpiryWarningEmail(subscription, daysBeforeExpiry);
          }
        } catch (error) {
          this.logger.error(`Failed to send expiry reminder for subscription ${subscriptionId}:`, error);
        }
        
        // Clean up the job after execution
        try {
          this.schedulerRegistry.deleteCronJob(jobName);
        } catch (error) {
          this.logger.error(`Failed to clean up reminder job ${jobName}:`, error);
        }
      });

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();

      this.logger.log(`Scheduled ${daysBeforeExpiry}-day reminder for subscription ${subscriptionId} at ${reminderDate.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to schedule reminder for subscription ${subscriptionId}:`, error);
    }
  }

  async scheduleUsageReset(subscriptionId: number, resetDate: Date): Promise<void> {
    try {
      // Validate reset date is in the future
      if (resetDate <= new Date()) {
        this.logger.warn(`Reset date ${resetDate.toISOString()} is in the past for subscription ${subscriptionId}, skipping scheduling`);
        return;
      }

      const jobName = `usage-reset-${subscriptionId}`;
      
      // Remove existing job if it exists
      try {
        this.schedulerRegistry.deleteCronJob(jobName);
      } catch (error) {
        // Job doesn't exist, which is fine
      }

      const cronExpression = this.createCronExpression(resetDate);
      this.logger.debug(`Creating usage reset cron job with expression: ${cronExpression} for subscription ${subscriptionId}`);
      
      const job = new CronJob(cronExpression, async () => {
        this.logger.log(`Resetting usage counters for subscription ${subscriptionId}`);
        let subscription: UserSubscription | null = null;
        try {
          subscription = await this.subscriptionsService.getUserSubscriptionById(subscriptionId);
          if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
            subscription.emailsUsed = 0;
            subscription.transactionsUsed = 0;
            await subscription.save();
            this.logger.log(`Usage counters reset for subscription ${subscriptionId}`);
          }
        } catch (error) {
          this.logger.error(`Failed to reset usage counters for subscription ${subscriptionId}:`, error);
        }
        
        // Schedule next reset based on billing cycle
        try {
          if (subscription && subscription.plan) {
            const nextResetDate = this.calculateNextResetDate(subscription.plan.billingCycle, resetDate);
            await this.scheduleUsageReset(subscriptionId, nextResetDate);
          }
        } catch (scheduleError) {
          this.logger.error(`Failed to schedule next usage reset for subscription ${subscriptionId}:`, scheduleError);
        }
      });

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();

      this.logger.log(`Scheduled usage reset for subscription ${subscriptionId} at ${resetDate.toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to schedule usage reset for subscription ${subscriptionId}:`, error);
    }
  }

  // Helper method to create precise cron expressions for exact timing
  private createCronExpression(date: Date): string {
    const second = date.getSeconds();
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Create cron expression: second minute hour day month dayOfWeek (6 fields format)
    // Note: We don't include year as it's not supported in standard cron format
    const cronExpression = `${second} ${minute} ${hour} ${dayOfMonth} ${month} *`;
    
    // Validate the cron expression
    if (!this.isValidCronExpression(cronExpression)) {
      this.logger.error(`Invalid cron expression generated: ${cronExpression} for date: ${date.toISOString()}`);
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
    
    return cronExpression;
  }

  // Validate cron expression format
  private isValidCronExpression(cronExpression: string): boolean {
    try {
      const parts = cronExpression.trim().split(/\s+/);
      
      // Should have exactly 6 parts for second-level precision
      if (parts.length !== 6) {
        return false;
      }
      
      // Basic validation for each part
      const [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      
      // Check ranges
      if (!this.isValidCronField(second, 0, 59) ||
          !this.isValidCronField(minute, 0, 59) ||
          !this.isValidCronField(hour, 0, 23) ||
          !this.isValidCronField(dayOfMonth, 1, 31) ||
          !this.isValidCronField(month, 1, 12) ||
          (dayOfWeek !== '*' && !this.isValidCronField(dayOfWeek, 0, 7))) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Validate individual cron field
  private isValidCronField(field: string, min: number, max: number): boolean {
    if (field === '*') return true;
    
    const num = parseInt(field, 10);
    return !isNaN(num) && num >= min && num <= max;
  }

  // Calculate next reset date based on billing cycle
  private calculateNextResetDate(billingCycle: string, currentDate: Date): Date {
    const nextReset = new Date(currentDate);
    
    switch (billingCycle) {
      case 'monthly':
        nextReset.setMonth(nextReset.getMonth() + 1);
        break;
      case 'quarterly':
        nextReset.setMonth(nextReset.getMonth() + 3);
        break;
      case 'annually':
        nextReset.setFullYear(nextReset.getFullYear() + 1);
        break;
      default:
        // Default to monthly
        nextReset.setMonth(nextReset.getMonth() + 1);
        break;
    }
    
    return nextReset;
  }

  // Method called when a new subscription is created to set up all scheduled jobs
  async setupSubscriptionSchedules(subscriptionId: number): Promise<void> {
    try {
      const subscription = await this.subscriptionsService.getUserSubscriptionById(subscriptionId);
      if (!subscription) {
        this.logger.error(`Subscription ${subscriptionId} not found for schedule setup`);
        return;
      }

      const now = new Date();
      const endDate = new Date(subscription.endDate);
      const nextBillingDate = subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : null;

      // Schedule renewal if auto-renew is enabled
      if (subscription.autoRenew && nextBillingDate) {
        await this.scheduleSubscriptionRenewal(subscriptionId, nextBillingDate);
      }

      // Schedule expiry reminders (7, 3, 1 days before)
      const reminderDays = [7, 3, 1];
      for (const days of reminderDays) {
        const reminderDate = new Date(endDate);
        reminderDate.setDate(reminderDate.getDate() - days);
        
        if (reminderDate > now) {
          await this.scheduleExpiryReminder(subscriptionId, reminderDate, days);
        }
      }

      // Schedule usage reset based on billing cycle
      const nextUsageReset = this.calculateNextResetDate(subscription.plan.billingCycle, new Date(subscription.startDate));
      if (nextUsageReset > now) {
        await this.scheduleUsageReset(subscriptionId, nextUsageReset);
      }

      this.logger.log(`All schedules set up for subscription ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to setup schedules for subscription ${subscriptionId}:`, error);
    }
  }

  // Method to cancel all scheduled jobs for a subscription
  async cancelSubscriptionSchedules(subscriptionId: number): Promise<void> {
    try {
      const jobPatterns = [
        `renewal-${subscriptionId}`,
        `reminder-${subscriptionId}-7days`,
        `reminder-${subscriptionId}-3days`, 
        `reminder-${subscriptionId}-1days`,
        `usage-reset-${subscriptionId}`
      ];

      for (const jobName of jobPatterns) {
        try {
          this.schedulerRegistry.deleteCronJob(jobName);
          this.logger.log(`Cancelled scheduled job: ${jobName}`);
        } catch (error) {
          // Job doesn't exist, which is fine
        }
      }

      this.logger.log(`All scheduled jobs cancelled for subscription ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel schedules for subscription ${subscriptionId}:`, error);
    }
  }
} 