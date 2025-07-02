import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';
import { EmailsService } from '../emails/emails.service';
import { SubscriptionStatus, UserSubscription } from './entities/user-subscription.entity';
import { CronJob } from 'cron';
import { InjectModel } from '@nestjs/sequelize';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { User } from '../users/entities/user.entity';
import { Op } from 'sequelize';
import { TransactionsService } from '../transactions/transactions.service';
import { FeeConfiguration, FeeConfigurationType } from '../superadmin/entities/fee-configuration.entity';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private subscriptionsService: SubscriptionsService,
    private emailService: EmailsService,
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(UserSubscription)
    private userSubscriptionModel: typeof UserSubscription,
    @InjectModel(SubscriptionPlan)
    private subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(User)
    private userModel: typeof User,
    private transactionsService: TransactionsService,
    @InjectModel(FeeConfiguration)
    private feeConfigurationModel: typeof FeeConfiguration,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionRenewals() {
    try {
      this.logger.log('Starting subscription renewal check...');

      // Get subscriptions due for renewal in the next 24 hours
      const subscriptionsDue = await this.userSubscriptionModel.findAll({
        where: {
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
          nextBillingDate: {
            [Op.lte]: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
          },
        },
        include: [
          {
            model: User,
            attributes: ['id', 'email', 'balance'],
          },
          {
            model: SubscriptionPlan,
            attributes: ['id', 'name', 'price', 'billingCycle'],
          },
        ],
      });

      for (const subscription of subscriptionsDue) {
        await this.processSubscriptionRenewal(subscription);
      }

      this.logger.log(`Processed ${subscriptionsDue.length} subscription renewals`);
    } catch (error) {
      this.logger.error('Error in subscription renewal cron:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleSubscriptionNotifications() {
    try {
      this.logger.log('Starting subscription expiration notifications...');

      // Get subscriptions expiring in the next 7 days
      const expiringSubscriptions = await this.userSubscriptionModel.findAll({
        where: {
          status: SubscriptionStatus.ACTIVE,
          nextBillingDate: {
            [Op.between]: [
              new Date(),
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            ],
          },
        },
        include: [
          {
            model: User,
            attributes: ['id', 'email'],
          },
          {
            model: SubscriptionPlan,
            attributes: ['id', 'name', 'price', 'billingCycle'],
          },
        ],
      });

      for (const subscription of expiringSubscriptions) {
        await this.sendExpirationNotification(subscription);
      }

      this.logger.log(`Sent ${expiringSubscriptions.length} expiration notifications`);
    } catch (error) {
      this.logger.error('Error in subscription notification cron:', error);
    }
  }

  private async processSubscriptionRenewal(subscription: UserSubscription) {
    const user = subscription.user;
    const plan = subscription.plan;

    if (!user || !plan) {
      this.logger.error(`Missing user or plan data for subscription ${subscription.id}`);
      return;
    }

    try {
      // Get applicable fee configuration
      const feeConfigs = await this.feeConfigurationModel.findAll({
        where: {
          userId: user.id,
          type: FeeConfigurationType.SUBSCRIPTION,
          subscriptionPlanId: plan.id
        }
      });

      let fee = 0;
      if (feeConfigs && feeConfigs.length > 0) {
        fee = Number(feeConfigs[0].fee);
      }

      const totalAmount = Number(plan.price) + fee;

      // Check if user has sufficient balance
      if (user.balance < totalAmount) {
        // Mark subscription as expired if insufficient funds
        await subscription.update({
          status: SubscriptionStatus.EXPIRED,
          autoRenew: false,
        });

        // Send insufficient funds notification
        await this.emailService.sendEmail({
          to: user.email,
          subject: 'Subscription Renewal Failed - Insufficient Funds',
          html: this.getEmailTemplate('subscription-renewal-failed', {
            planName: plan.name,
            requiredAmount: totalAmount,
            currentBalance: user.balance,
          })
        });

        return;
      }

      // Process subscription payment
      await this.transactionsService.createTransaction({
        userId: user.id,
        amount: plan.price,
        type: 'DEBIT',
        description: `Subscription renewal for ${plan.name}`,
        transactionDate: new Date(),
      });

      // If there's a fee, handle fee transactions
      if (fee > 0) {
        const superadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
        if (superadmin) {
          // Credit fee to superadmin
          superadmin.balance = Number(superadmin.balance) + fee;
          await superadmin.save();

          // Fee debit from user
          await this.transactionsService.createTransaction({
            userId: user.id,
            amount: fee,
            type: 'DEBIT',
            description: `Subscription fee for ${plan.name}`,
            transactionDate: new Date(),
          });

          // Fee credit to superadmin
          await this.transactionsService.createTransaction({
            userId: superadmin.id,
            amount: fee,
            type: 'CREDIT',
            description: `Subscription fee from ${user.email} for ${plan.name}`,
            transactionDate: new Date(),
          });
        }
      }

      // Deduct total amount from user's balance
      user.balance = Number(user.balance) - totalAmount;
      await user.save();

      // Calculate next billing date based on billing cycle
      if (!subscription.nextBillingDate) {
        throw new Error('Next billing date is not set');
      }

      const nextBillingDate = new Date(subscription.nextBillingDate);
      switch (plan.billingCycle) {
        case 'monthly':
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
          break;
        case 'annually':
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          break;
      }

      // Update subscription
      await subscription.update({
        nextBillingDate,
        status: SubscriptionStatus.ACTIVE
      });

      // Send renewal confirmation email
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Subscription Renewed Successfully',
        html: this.getEmailTemplate('subscription-renewed', {
          planName: plan.name,
          amount: totalAmount,
          nextBillingDate: nextBillingDate.toLocaleDateString()
        })
      });

    } catch (error) {
      this.logger.error(`Error processing subscription renewal for subscription ${subscription.id}:`, error);
      
      // Send error notification
      try {
        await this.emailService.sendEmail({
          to: user.email,
          subject: 'Subscription Renewal Failed',
          html: this.getEmailTemplate('subscription-renewal-error', {
            planName: plan.name,
            error: error.message
          })
        });
      } catch (emailError) {
        this.logger.error('Failed to send error notification email:', emailError);
      }
    }
  }

  private async sendExpirationNotification(subscription: UserSubscription) {
    const user = subscription.user;
    const plan = subscription.plan;

    if (!user || !plan || !subscription.nextBillingDate) {
      this.logger.error(`Missing user, plan, or next billing date data for subscription ${subscription.id}`);
      return;
    }

    const daysUntilExpiration = Math.ceil(
      (subscription.nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Subscription Expiring Soon',
      html: this.getEmailTemplate('subscription-expiration-reminder', {
        planName: plan.name,
        daysRemaining: daysUntilExpiration,
        renewalAmount: plan.price,
        autoRenew: subscription.autoRenew,
      })
    });
  }

  private getEmailTemplate(templateName: string, context: Record<string, any>): string {
    // This is a placeholder implementation. In a real application,
    // you would load the email template from a file and replace variables
    const templates: Record<string, string> = {
      'subscription-renewal-failed': `
        <h1>Subscription Renewal Failed</h1>
        <p>Your subscription to ${context.planName} could not be renewed due to insufficient funds.</p>
        <p>Required amount: ${context.requiredAmount}</p>
        <p>Current balance: ${context.currentBalance}</p>
      `,
      'subscription-renewed': `
        <h2>Subscription Renewed Successfully</h2>
        <p>Dear user,</p>
        <p>Your subscription to ${context.planName} has been renewed successfully.</p>
        <p>Amount charged: $${context.amount}</p>
        <p>Next billing date: ${context.nextBillingDate}</p>
      `,
      'subscription-renewal-error': `
        <h1>Subscription Renewal Failed</h1>
        <p>Dear user,</p>
        <p>We encountered an error while trying to renew your subscription to ${context.planName}.</p>
        <p>Error: ${context.error}</p>
        <p>Our team has been notified and will look into this issue.</p>
      `,
      'subscription-expiration-reminder': `
        <h1>Subscription Expiring Soon</h1>
        <p>Your subscription to ${context.planName} will expire in ${context.daysRemaining} days.</p>
        <p>Renewal amount: ${context.renewalAmount}</p>
        <p>Auto-renewal: ${context.autoRenew ? 'Enabled' : 'Disabled'}</p>
      `,
    };

    return templates[templateName] || '';
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
        this.logger.log(`Executing scheduled reminder for subscription ${subscriptionId}`);
        try {
          const subscription = await this.subscriptionsService.getUserSubscriptionById(subscriptionId);
          if (subscription && subscription.status === SubscriptionStatus.ACTIVE && subscription.autoRenew) {
            await this.sendExpiryWarningEmail(subscription, daysBeforeExpiry);
            this.logger.log(`Successfully sent reminder for subscription ${subscriptionId}`);
          }
        } catch (error) {
          this.logger.error(`Failed to execute scheduled reminder for subscription ${subscriptionId}:`, error);
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

      this.logger.log(`Scheduled reminder for subscription ${subscriptionId} to expire in ${daysBeforeExpiry} days`);
    } catch (error) {
      this.logger.error(`Failed to schedule reminder for subscription ${subscriptionId}:`, error);
    }
  }

  private createCronExpression(date: Date): string {
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();
    const year = date.getFullYear();

    return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek} ${year}`;
  }

  // Method to set up subscription schedules when a new subscription is created
  async setupSubscriptionSchedules(subscriptionId: number): Promise<void> {
    try {
      const subscription = await this.userSubscriptionModel.findByPk(subscriptionId, {
        include: [
          {
            model: User,
            attributes: ['id', 'email'],
          },
          {
            model: SubscriptionPlan,
            attributes: ['id', 'name', 'price', 'billingCycle'],
          },
        ],
      });

      if (!subscription || !subscription.nextBillingDate) {
        throw new Error(`Subscription ${subscriptionId} not found or missing next billing date`);
      }

      // Schedule renewal reminder (3 days before)
      const reminderDate = new Date(subscription.nextBillingDate);
      reminderDate.setDate(reminderDate.getDate() - 3);
      
      if (reminderDate > new Date()) {
        const jobName = `subscription-reminder-${subscriptionId}`;
        const job = new CronJob(reminderDate, async () => {
          await this.sendExpirationNotification(subscription);
        });

        this.schedulerRegistry.addCronJob(jobName, job);
        job.start();

        this.logger.log(`Scheduled renewal reminder for subscription ${subscriptionId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to setup subscription schedules for ${subscriptionId}:`, error);
      throw error;
    }
  }

  // Method to cancel all scheduled jobs when a subscription is cancelled
  async cancelSubscriptionSchedules(subscriptionId: number): Promise<void> {
    try {
      const jobName = `subscription-reminder-${subscriptionId}`;
      
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
        this.logger.log(`Cancelled scheduled jobs for subscription ${subscriptionId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to cancel subscription schedules for ${subscriptionId}:`, error);
      throw error;
    }
  }
}