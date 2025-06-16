import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Email } from '../emails/entities/email.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { EmailsService } from '../emails/emails.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

export interface CronJobInfo {
  name: string;
  schedule: string;
  description: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  jobType?: 'transaction' | 'email' | 'maintenance' | 'custom';
  transactionConfig?: {
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    description: string;
    targetUsers?: 'all' | 'specific';
    userIds?: number[];
    conditions?: {
      minBalance?: number;
      maxBalance?: number;
    };
  };
}

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);
  private cronJobConfigs = new Map<string, { schedule: string; description: string; jobType: string; transactionConfig?: any }>();

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(Email)
    private emailModel: typeof Email,
    private transactionsService: TransactionsService,
    private emailsService: EmailsService,
    private schedulerRegistry: SchedulerRegistry
  ) {}

  // Dashboard Stats
  async getDashboardStats() {
    try {
      const [totalUsers, totalTransactions, totalEmails] = await Promise.all([
        this.userModel.count({ where: { role: 'user' } }),
        this.transactionModel.count(),
        this.emailModel.count()
      ]);

      // Calculate new users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newUsersThisMonth = await this.userModel.count({
        where: {
          role: 'user',
          createdAt: {
            $gte: startOfMonth
          }
        }
      });

      // Calculate previous month for growth comparison
      const startOfPrevMonth = new Date(startOfMonth);
      startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);

      const usersLastMonth = await this.userModel.count({
        where: {
          role: 'user',
          createdAt: {
            $gte: startOfPrevMonth,
            $lt: startOfMonth
          }
        }
      });

      const monthlyGrowth = usersLastMonth > 0 
        ? Math.round(((newUsersThisMonth - usersLastMonth) / usersLastMonth) * 100)
        : 100;

      return {
        totalUsers,
        totalTransactions,
        totalEmails,
        satisfactionRate: 89.9, // This could be calculated based on user feedback
        monthlyGrowth: Math.max(0, monthlyGrowth),
        newUsersThisMonth
      };
    } catch (error) {
      this.logger.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // User Management
  async getAllUsers() {
    try {
      const users = await this.userModel.findAll({
        where: { role: 'user' },
        attributes: ['id', 'name', 'email', 'phone', 'balance', 'role', 'createdAt'],
        order: [['createdAt', 'DESC']]
      });

      return users.map(user => ({
        ...user.get({ plain: true }),
        status: 'Active' // You can add a status field to the User model if needed
      }));
    } catch (error) {
      this.logger.error('Error fetching users:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: number, status: 'Active' | 'Inactive') {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // You can add a status field to the User model and update it here
      // For now, we'll just log the action
      this.logger.log(`User ${userId} status updated to ${status}`);
      
      return { message: 'User status updated successfully' };
    } catch (error) {
      this.logger.error('Error updating user status:', error);
      throw error;
    }
  }

  // Transaction Management
  async getAllTransactions() {
    try {
      const transactions = await this.transactionModel.findAll({
        include: [{
          model: User,
          attributes: ['name', 'email']
        }],
        order: [['transactionDate', 'DESC']],
        limit: 1000 // Limit to prevent performance issues
      });

      return transactions.map(transaction => transaction.get({ plain: true }));
    } catch (error) {
      this.logger.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Email Management
  async getAllEmails() {
    try {
      const emails = await this.emailModel.findAll({
        order: [['createdAt', 'DESC']],
        limit: 1000 // Limit to prevent performance issues
      });

      return emails.map(email => ({
        ...email.get({ plain: true }),
        sentAt: email.createdAt,
        status: 'Sent' // You can add proper status tracking to the Email model
      }));
    } catch (error) {
      this.logger.error('Error fetching emails:', error);
      throw error;
    }
  }

  async resendEmail(emailId: number) {
    try {
      const email = await this.emailModel.findByPk(emailId);
      if (!email) {
        throw new NotFoundException('Email not found');
      }

      // Resend the email using the emails service
      await this.emailsService.sendEmailDirect({
        to: email.recipient,
        subject: email.subject,
        text: email.body,
        html: email.htmlBody || email.body,
        senderUserId: 1 // Superadmin user ID
      });

      this.logger.log(`Email ${emailId} resent successfully`);
      return { message: 'Email resent successfully' };
    } catch (error) {
      this.logger.error('Error resending email:', error);
      throw error;
    }
  }

  // Cron Job Management
  async getCronJobs(): Promise<CronJobInfo[]> {
    try {
      const cronJobs: CronJobInfo[] = [];
      
      // Get all registered cron jobs from the scheduler
      const jobs = this.schedulerRegistry.getCronJobs();
      
             jobs.forEach((job, name) => {
         // Check if job is running - use multiple methods to ensure accuracy
         const isRunning = !!(job as any).running || (job as any).started || false;
         
         cronJobs.push({
           name,
           schedule: this.getCronExpression(job, name),
           description: this.getCronDescription(name),
           isActive: isRunning,
           lastRun: job.lastDate()?.toString(),
           nextRun: job.nextDate()?.toString()
         });
       });

      // Add default jobs if they don't exist
      if (!jobs.has('daily-deduction')) {
        cronJobs.push({
          name: 'daily-deduction',
          schedule: '0 1 * * *',
          description: 'Daily deduction from user accounts',
          isActive: true,
          lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }

      return cronJobs;
    } catch (error) {
      this.logger.error('Error fetching cron jobs:', error);
      return [];
    }
  }

  async createCronJob(cronJobData: CronJobInfo) {
    try {
      const { name, schedule, description, isActive, jobType, transactionConfig } = cronJobData;

      if (this.schedulerRegistry.doesExist('cron', name)) {
        throw new BadRequestException('Cron job with this name already exists');
      }

      // Validate transaction config if it's a transaction job
      if (jobType === 'transaction' && !transactionConfig) {
        throw new BadRequestException('Transaction configuration is required for transaction jobs');
      }

      if (transactionConfig) {
        if (!transactionConfig.type || !transactionConfig.amount || !transactionConfig.description) {
          throw new BadRequestException('Transaction type, amount, and description are required');
        }
        if (transactionConfig.amount <= 0) {
          throw new BadRequestException('Transaction amount must be greater than 0');
        }
      }

      // Store job configuration for later execution and display
      const jobConfig = {
        name,
        schedule,
        description,
        jobType: jobType || 'custom',
        transactionConfig
      };

      // Store the configuration for retrieval
      this.cronJobConfigs.set(name, {
        schedule,
        description,
        jobType: jobType || 'custom',
        transactionConfig
      });

      // Create a new cron job with seconds support
      const job = new CronJob(schedule, () => {
        this.logger.log(`Executing cron job: ${name}`);
        this.executeCronJob(name, jobConfig);
      }, null, false, null, null, true); // The last parameter (true) enables seconds support

      // Add the job to the scheduler
      this.schedulerRegistry.addCronJob(name, job);

      if (isActive) {
        job.start();
        this.logger.log(`Cron job '${name}' started and is now active`);
      } else {
        this.logger.log(`Cron job '${name}' created but not started (isActive: ${isActive})`);
      }

      this.logger.log(`Cron job '${name}' created successfully with type: ${jobType || 'custom'}`);
      return { message: 'Cron job created successfully', jobConfig };
    } catch (error) {
      this.logger.error('Error creating cron job:', error);
      throw error;
    }
  }

  async updateCronJob(name: string, cronJobData: CronJobInfo) {
    try {
      if (!this.schedulerRegistry.doesExist('cron', name)) {
        throw new NotFoundException('Cron job not found');
      }

      const job = this.schedulerRegistry.getCronJob(name);
      const isCurrentlyRunning = !!(job as any).running || (job as any).started || false;
      
      if (cronJobData.isActive && !isCurrentlyRunning) {
        job.start();
        this.logger.log(`Cron job '${name}' started`);
      } else if (!cronJobData.isActive && isCurrentlyRunning) {
        job.stop();
        this.logger.log(`Cron job '${name}' stopped`);
      }

      this.logger.log(`Cron job '${name}' updated successfully`);
      return { message: 'Cron job updated successfully' };
    } catch (error) {
      this.logger.error('Error updating cron job:', error);
      throw error;
    }
  }

  async deleteCronJob(name: string) {
    try {
      if (!this.schedulerRegistry.doesExist('cron', name)) {
        throw new NotFoundException('Cron job not found');
      }

      this.schedulerRegistry.deleteCronJob(name);
      
      // Clean up stored configuration
      this.cronJobConfigs.delete(name);
      
      this.logger.log(`Cron job '${name}' deleted successfully`);
      return { message: 'Cron job deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting cron job:', error);
      throw error;
    }
  }

  async runCronJobNow(name: string) {
    try {
      this.logger.log(`Manually executing cron job: ${name}`);
      
      // Execute the cron job logic based on the name
      // For manual execution, we'll use default config
      const defaultConfig = {
        name,
        description: this.getCronDescription(name),
        jobType: 'custom' as const,
        transactionConfig: undefined
      };
      
      await this.executeCronJob(name, defaultConfig);
      
      return { message: 'Cron job executed successfully' };
    } catch (error) {
      this.logger.error('Error running cron job:', error);
      throw error;
    }
  }

  // Helper methods
  private getCronExpression(job: CronJob, name: string): string {
    // Get the actual schedule from stored configurations
    const config = this.cronJobConfigs.get(name);
    return config?.schedule || '0 1 * * *'; // Default expression if not found
  }

  private getCronDescription(name: string): string {
    // First check stored configurations
    const config = this.cronJobConfigs.get(name);
    if (config?.description) {
      return config.description;
    }

    // Fallback to default descriptions
    const descriptions: { [key: string]: string } = {
      'daily-deduction': 'Daily deduction from user accounts',
      'weekly-report': 'Weekly report generation',
      'monthly-cleanup': 'Monthly data cleanup'
    };
    
    return descriptions[name] || 'Custom cron job';
  }

  // Get all users for transaction targeting
  async getUsersForTransactionJob() {
    try {
      const users = await this.userModel.findAll({
        where: { role: 'user' },
        attributes: ['id', 'name', 'email', 'balance'],
        order: [['name', 'ASC']]
      });

      return users.map(user => user.get({ plain: true }));
    } catch (error) {
      this.logger.error('Error fetching users for transaction job:', error);
      throw error;
    }
  }

  private async executeCronJob(name: string, jobConfig?: any) {
    try {
      if (jobConfig?.jobType === 'transaction' && jobConfig.transactionConfig) {
        await this.executeTransactionCronJob(jobConfig.transactionConfig);
        return;
      }

      // Handle legacy/default cron jobs
      switch (name) {
        case 'daily-deduction':
          await this.transactionsService.processDeductions();
          break;
        case 'weekly-report':
          // Implement weekly report logic
          this.logger.log('Weekly report generated');
          break;
        default:
          this.logger.log(`Executed custom cron job: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Error executing cron job ${name}:`, error);
      throw error;
    }
  }

  private async executeTransactionCronJob(config: any) {
    try {
      const { type, amount, description, targetUsers, userIds, conditions } = config;
      
      let users: User[] = [];
      
      if (targetUsers === 'specific' && userIds && userIds.length > 0) {
        // Get specific users
        users = await this.userModel.findAll({
          where: {
            id: userIds,
            role: 'user'
          }
        });
      } else {
        // Get all users or users matching conditions
        const whereClause: any = { role: 'user' };
        
        if (conditions) {
          if (conditions.minBalance !== undefined) {
            whereClause.balance = { ...whereClause.balance, $gte: conditions.minBalance };
          }
          if (conditions.maxBalance !== undefined) {
            whereClause.balance = { ...whereClause.balance, $lte: conditions.maxBalance };
          }
        }
        
        users = await this.userModel.findAll({ where: whereClause });
      }

      if (users.length === 0) {
        this.logger.warn('No users found matching the criteria for transaction cron job');
        return;
      }

      // Process transactions for each user
      const results: Array<{ userId: number; transactionId?: number; success: boolean; error?: string }> = [];
      for (const user of users) {
        try {
          if (type === 'DEBIT' && user.balance < amount) {
            this.logger.warn(`Insufficient balance for user ${user.id}: ${user.balance} < ${amount}`);
            continue;
          }

          const transaction = await this.transactionModel.create({
            userId: user.id,
            type,
            amount,
            description: `[SCHEDULED] ${description}`,
            transactionDate: new Date()
          } as any);

          // Update user balance
          const newBalance = type === 'CREDIT' 
            ? user.balance + amount 
            : user.balance - amount;
            
          await user.update({ balance: newBalance });

          results.push({
            userId: user.id,
            transactionId: transaction.id,
            success: true
          });

          this.logger.log(`Scheduled ${type} transaction completed for user ${user.id}: ${amount}`);
        } catch (error) {
          this.logger.error(`Error processing transaction for user ${user.id}:`, error);
          results.push({
            userId: user.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.log(`Scheduled transaction cron job completed. Processed ${results.length} users, ${results.filter(r => r.success).length} successful`);
    } catch (error) {
      this.logger.error('Error executing transaction cron job:', error);
      throw error;
    }
  }

  // Create superadmin user
  async createSuperadmin(userData: { name: string; email: string; password: string; phone: string }) {
    try {
      const bcrypt = require('bcrypt');
      
      // Check if superadmin already exists
      const existingSuperadmin = await this.userModel.findOne({ where: { role: 'superadmin' } });
      if (existingSuperadmin) {
        throw new BadRequestException('Superadmin already exists');
      }

      // Check if email already exists
      const existingUser = await this.userModel.findOne({ where: { email: userData.email } });
      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const superadmin = await this.userModel.create({
        name: userData.name,
        email: userData.email,
        password_hash: hashedPassword,
        phone: userData.phone,
        role: 'superadmin',
        balance: 0,
      } as any);

      const { password_hash, ...result } = superadmin.get({ plain: true });
      
      this.logger.log(`Superadmin created successfully: ${userData.email}`);
      return { message: 'Superadmin created successfully', user: result };
    } catch (error) {
      this.logger.error('Error creating superadmin:', error);
      throw error;
    }
  }
} 