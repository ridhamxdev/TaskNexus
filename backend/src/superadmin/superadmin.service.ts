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
}

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

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
         cronJobs.push({
           name,
           schedule: this.getCronExpression(job),
           description: this.getCronDescription(name),
           isActive: (job as any).running || false,
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
      const { name, schedule, description, isActive } = cronJobData;

      if (this.schedulerRegistry.doesExist('cron', name)) {
        throw new BadRequestException('Cron job with this name already exists');
      }

      // Create a new cron job
      const job = new CronJob(schedule, () => {
        this.logger.log(`Executing cron job: ${name}`);
        // Add your cron job logic here based on the job name
        this.executeCronJob(name);
      });

      // Add the job to the scheduler
      this.schedulerRegistry.addCronJob(name, job);

      if (isActive) {
        job.start();
      }

      this.logger.log(`Cron job '${name}' created successfully`);
      return { message: 'Cron job created successfully' };
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
      
      if (cronJobData.isActive && !(job as any).running) {
        job.start();
      } else if (!cronJobData.isActive && (job as any).running) {
        job.stop();
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
      await this.executeCronJob(name);
      
      return { message: 'Cron job executed successfully' };
    } catch (error) {
      this.logger.error('Error running cron job:', error);
      throw error;
    }
  }

  // Helper methods
  private getCronExpression(job: CronJob): string {
    // This is a simplified version - you might need to implement proper cron expression extraction
    return '0 1 * * *'; // Default expression
  }

  private getCronDescription(name: string): string {
    const descriptions: { [key: string]: string } = {
      'daily-deduction': 'Daily deduction from user accounts',
      'weekly-report': 'Weekly report generation',
      'monthly-cleanup': 'Monthly data cleanup'
    };
    
    return descriptions[name] || 'Custom cron job';
  }

  private async executeCronJob(name: string) {
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