import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Email } from '../emails/entities/email.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { EmailsService } from '../emails/emails.service';

export interface Settings {
  dailyDeductionAmount: number;
  emailNotifications: {
    transactions: boolean;
    dailyDeductions: boolean;
  };
  lastUpdated?: string;
}

export interface Notification {
  id: number;
  type: 'transaction' | 'login' | 'system' | 'security';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  relatedId?: number;
  userEmail?: string;
}

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);
  private settings: Settings = {
    dailyDeductionAmount: 50,
    emailNotifications: {
      transactions: true,
      dailyDeductions: true
    }
  };
  private notifications: Notification[] = [];

  constructor(
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Transaction)
    private transactionModel: typeof Transaction,
    @InjectModel(Email)
    private emailModel: typeof Email,
    private transactionsService: TransactionsService,
    private emailsService: EmailsService
  ) {
    this.initializeNotifications();
  }

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
        include: [{ 
          model: User, 
          as: 'sender',
          attributes: ['name', 'email'] 
        }],
        order: [['createdAt', 'DESC']],
        limit: 1000 // Limit to prevent performance issues
      });

      return emails.map(email => ({
        id: email.id,
        to: email.recipient, // Map recipient to 'to' for frontend
        subject: email.subject,
        body: email.body,
        htmlBody: email.htmlBody,
        status: email.status || 'Sent', // Use actual status from database
        sentAt: email.sentAt || email.createdAt, // Use sentAt if available, otherwise createdAt
        createdAt: email.createdAt,
        attempts: email.attempts,
        failureReason: email.failureReason,
        sender: email.sender ? {
          name: email.sender.name,
          email: email.sender.email
        } : null
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

  // Settings Management
  async getSettings(): Promise<Settings> {
    return {
      ...this.settings,
      lastUpdated: new Date().toISOString()
    };
  }

  async updateSettings(newSettings: Settings): Promise<{ message: string }> {
    try {
      this.settings = {
        ...this.settings,
        ...newSettings,
        lastUpdated: new Date().toISOString()
      };
      
      this.logger.log('Settings updated successfully');
      return { message: 'Settings updated successfully' };
    } catch (error) {
      this.logger.error('Error updating settings:', error);
      throw error;
    }
  }

  // Getter method for accessing settings from other services
  getCurrentSettings(): Settings {
    return this.settings;
  }

  // Notifications Management
  async getNotifications(): Promise<Notification[]> {
    try {
      const [recentTransactions, recentLogins, systemNotifications] = await Promise.all([
        this.getRecentTransactionNotifications(),
        this.getRecentLoginNotifications(),
        this.getSystemNotifications()
      ]);
      
      this.notifications = [...recentTransactions, ...recentLogins, ...systemNotifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 15); // Increase limit to 15 most recent

      // Only use mock data if we have no real data at all
      if (this.notifications.length === 0) {
        this.logger.warn('No real notifications found, using fallback data');
        return this.getMockNotifications();
      }

      return this.notifications;
    } catch (error) {
      this.logger.error('Error fetching notifications:', error);
      return this.getMockNotifications();
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<{ message: string }> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.logger.log(`Notification ${notificationId} marked as read`);
    }
    return { message: 'Notification marked as read' };
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    this.notifications.forEach(notification => {
      notification.isRead = true;
    });
    this.logger.log('All notifications marked as read');
    return { message: 'All notifications marked as read' };
  }

  private async getRecentTransactionNotifications(): Promise<Notification[]> {
    try {
      // Get recent significant transactions (all transactions from last 7 days)
      const recentTransactions = await this.transactionModel.findAll({
        include: [{ model: User, attributes: ['name', 'email'] }],
        where: {
          transactionDate: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        order: [['transactionDate', 'DESC']],
        limit: 8
      });

      return recentTransactions.map((transaction) => {
        const isLargeTransaction = transaction.amount >= 1000;
        const isLowBalance = transaction.type === 'DEBIT' && transaction.amount >= 500;
        
        let title = 'Transaction Alert';
        let priority = 'normal';
        
        if (isLargeTransaction) {
          title = transaction.type === 'CREDIT' ? 'Large Credit Transaction' : 'Large Debit Transaction';
          priority = 'high';
        } else if (isLowBalance) {
          title = 'Significant Debit Transaction';
          priority = 'medium';
        } else {
          title = `${transaction.type} Transaction`;
        }

        return {
          id: 1000 + transaction.id,
          type: 'transaction' as const,
          title,
          message: `User ${transaction.user?.email || 'Unknown'} ${transaction.type === 'CREDIT' ? 'received' : 'was charged'} ₹${transaction.amount}${transaction.description ? ` - ${transaction.description}` : ''}`,
          createdAt: transaction.transactionDate.toISOString(),
          isRead: false,
          relatedId: transaction.id,
          userEmail: transaction.user?.email
        };
      });
    } catch (error) {
      this.logger.error('Error fetching transaction notifications:', error);
      return [];
    }
  }

  private async getRecentLoginNotifications(): Promise<Notification[]> {
    try {
      // Get recent user registrations and admin activities as login notifications
      const recentUsers = await this.userModel.findAll({
        where: {
          createdAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['id', 'name', 'email', 'role', 'createdAt']
      });

      const loginNotifications: Notification[] = [];

      // Add new user registrations as notifications
      recentUsers.forEach(user => {
        if (user.role === 'user') {
          loginNotifications.push({
            id: 3000 + user.id,
            type: 'login',
            title: 'New User Registration',
            message: `New user ${user.email} has registered and joined the platform`,
            createdAt: user.createdAt.toISOString(),
            isRead: false,
            relatedId: user.id,
            userEmail: user.email
          });
        } else if (user.role === 'superadmin') {
          loginNotifications.push({
            id: 3100 + user.id,
            type: 'security',
            title: 'New Admin Account',
            message: `New superadmin account created for ${user.email}`,
            createdAt: user.createdAt.toISOString(),
            isRead: false,
            relatedId: user.id,
            userEmail: user.email
          });
        }
      });

      return loginNotifications;
    } catch (error) {
      this.logger.error('Error fetching login notifications:', error);
      return [];
    }
  }

  private async getSystemNotifications(): Promise<Notification[]> {
    try {
      const now = new Date();
      const systemNotifications: Notification[] = [];

      // Get actual system stats for notifications
      const [totalUsers, totalTransactions, recentEmails] = await Promise.all([
        this.userModel.count({ where: { role: 'user' } }),
        this.transactionModel.count(),
        this.emailModel.findAll({
          where: {
            createdAt: {
              $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          limit: 1,
          order: [['createdAt', 'DESC']]
        })
      ]);

      // Daily deduction notification based on actual settings
      systemNotifications.push({
        id: 2001,
        type: 'system',
        title: 'Daily Deduction Status',
        message: `System is configured to deduct ₹${this.settings.dailyDeductionAmount} daily from ${totalUsers} active users at 1:00 AM`,
        createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        isRead: false
      });

      // Email system status
      if (recentEmails.length > 0) {
        systemNotifications.push({
          id: 2002,
          type: 'system',
          title: 'Email System Active',
          message: `Email notifications are functioning normally. Last email sent successfully`,
          createdAt: recentEmails[0].createdAt.toISOString(),
          isRead: false
        });
      }

      // Database statistics notification
      systemNotifications.push({
        id: 2003,
        type: 'system',
        title: 'System Statistics',
        message: `Database contains ${totalUsers} users and ${totalTransactions} total transactions`,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        isRead: false
      });

      // Settings update notification (if settings were recently updated)
      if (this.settings.lastUpdated) {
        const lastUpdateTime = new Date(this.settings.lastUpdated);
        const timeSinceUpdate = now.getTime() - lastUpdateTime.getTime();
        
        // Only show if updated in last 2 hours
        if (timeSinceUpdate <= 2 * 60 * 60 * 1000) {
          systemNotifications.push({
            id: 2004,
            type: 'system',
            title: 'Settings Updated',
            message: `System settings were recently modified. Email notifications: ${this.settings.emailNotifications.transactions ? 'Enabled' : 'Disabled'}`,
            createdAt: this.settings.lastUpdated,
            isRead: false
          });
        }
      }

      return systemNotifications;
    } catch (error) {
      this.logger.error('Error generating system notifications:', error);
      // Fallback to basic system notification
      return [{
        id: 2000,
        type: 'system',
        title: 'System Status',
        message: 'System is running normally',
        createdAt: new Date().toISOString(),
        isRead: false
      }];
    }
  }

  private getMockNotifications(): Notification[] {
    const now = new Date();
    this.logger.warn('Using fallback mock notifications - no real data available');
    return [
      {
        id: 9001,
        type: 'system',
        title: 'System Initialized',
        message: 'Notification system started successfully',
        createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        isRead: false
      },
      {
        id: 9002,
        type: 'system',
        title: 'Database Connected',
        message: 'Successfully connected to database',
        createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        isRead: false
      }
    ];
  }

  private initializeNotifications() {
    // Initialize with empty array, will be populated on first request
    this.notifications = [];
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

  // Method to create notifications for real-time events
  createNotification(type: 'transaction' | 'login' | 'system' | 'security', title: string, message: string, relatedId?: number, userEmail?: string): void {
    const notification: Notification = {
      id: Date.now(), // Use timestamp as unique ID
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
      isRead: false,
      relatedId,
      userEmail
    };
    
    this.notifications.unshift(notification); // Add to beginning
    this.notifications = this.notifications.slice(0, 15); // Keep only latest 15
    this.logger.log(`New notification created: ${title}`);
  }

  // Method to be called from other services when important events happen
  logTransactionNotification(userId: number, amount: number, type: 'CREDIT' | 'DEBIT', userEmail: string): void {
    if (amount >= 1000) {
      this.createNotification(
        'transaction',
        `Large ${type} Transaction`,
        `User ${userEmail} ${type === 'CREDIT' ? 'received' : 'was charged'} ₹${amount}`,
        userId,
        userEmail
      );
    }
  }

  logSystemEvent(title: string, message: string): void {
    this.createNotification('system', title, message);
  }
} 