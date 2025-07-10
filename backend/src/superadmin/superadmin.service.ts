import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User, UserRole } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Email } from '../emails/entities/email.entity';
import { UserSubscription, SubscriptionStatus } from '../subscriptions/entities/user-subscription.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { SubscriptionPayment } from '../subscriptions/entities/subscription-payment.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { EmailsService } from '../emails/emails.service';
import { JwtService } from '@nestjs/jwt';
import { Op, Sequelize } from 'sequelize';
import { FeeConfiguration, FeeConfigurationType } from './entities/fee-configuration.entity';
import { FeeConfigurationDto, BulkFeeConfigurationDto } from './dto/fee-configuration.dto';
import { DefaultFeeConfiguration, FeeType } from './entities/default-fee-configuration.entity';
import { CreateDefaultFeeConfigurationDto, UpdateDefaultFeeConfigurationDto, ToggleUserDefaultFeeDto } from './dto/default-fee-configuration.dto';
import { FeeConfigurationVersion, VersionAction } from './entities/fee-configuration-version.entity';
import { FeeVersion } from './entities/fee-version.entity';
import { GlobalFeeVersion } from './entities/global-fee-version.entity';
import { UserNotification, NotificationType, NotificationStatus } from '../users/entities/user-notification.entity';

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
    @InjectModel(UserSubscription)
    private userSubscriptionModel: typeof UserSubscription,
    @InjectModel(SubscriptionPlan)
    private subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(SubscriptionPayment)
    private subscriptionPaymentModel: typeof SubscriptionPayment,
    @InjectModel(FeeConfiguration)
    private feeConfigurationModel: typeof FeeConfiguration,
    @InjectModel(DefaultFeeConfiguration)
    private defaultFeeConfigurationModel: typeof DefaultFeeConfiguration,
    @InjectModel(FeeConfigurationVersion)
    private feeConfigurationVersionModel: typeof FeeConfigurationVersion,
    @InjectModel(FeeVersion)
    private feeVersionModel: typeof FeeVersion,
    @InjectModel(GlobalFeeVersion)
    private globalFeeVersionModel: typeof GlobalFeeVersion,
    @InjectModel(UserNotification)
    private userNotificationModel: typeof UserNotification,
    @Inject(forwardRef(() => TransactionsService))
    private transactionsService: TransactionsService,
    private emailsService: EmailsService,
    private jwtService: JwtService
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

  async getUserById(userId: number) {
    const user = await this.userModel.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'deleted_at'] },
      include: [
        {
          model: this.userSubscriptionModel,
          include: [this.subscriptionPlanModel],
          separate: true,
          order: [['createdAt', 'DESC']],
        },
        {
          model: this.transactionModel,
          limit: 10,
          separate: true,
          order: [['transactionDate', 'DESC']],
        }
      ]
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Emails must be fetched separately as there's no direct FK association
    const emails = await this.emailModel.findAll({
      where: { recipient: user.email },
      limit: 10,
      order: [['createdAt', 'DESC']],
    });

    const userData = user.get({ plain: true });
    
    // Manually attach emails to the response object.
    // We'll define a custom interface on the frontend to handle this.
    (userData as any).emails = emails;

    return userData;
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

  async updateUserRole(userId: number, role: string) {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate and convert role to enum
      let userRole: UserRole;
      if (role === 'user') {
        userRole = UserRole.USER;
      } else if (role === 'superadmin') {
        userRole = UserRole.SUPERADMIN;
      } else {
        throw new BadRequestException('Invalid role. Must be either "user" or "superadmin"');
      }

      // Update the user's role
      await this.userModel.update(
        { role: userRole },
        { where: { id: userId } }
      );

      this.logger.log(`User ${userId} role updated to ${role}`);
      
      // Create notification for role change
      this.createNotification(
        'security',
        'User Role Updated',
        `User ${user.name} (${user.email}) role changed to ${role}`,
        userId,
        user.email
      );
      
      return { 
        message: 'User role updated successfully. The user will need to log out and log back in for changes to take effect.',
        requiresRelogin: true 
      };
    } catch (error) {
      this.logger.error('Error updating user role:', error);
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

  // Subscription Management Methods
  async getAllSubscriptions() {
    try {
      const subscriptions = await this.userSubscriptionModel.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'phone', 'balance']
          },
          {
            model: SubscriptionPlan,
            as: 'plan',
            attributes: ['id', 'name', 'price', 'billingCycle', 'features']
          },
          {
            model: SubscriptionPayment,
            as: 'payments',
            limit: 1,
            order: [['createdAt', 'DESC']]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return subscriptions.map(subscription => ({
        ...subscription.get({ plain: true }),
        isActive: subscription.isActive(),
        isExpiringSoon: subscription.isExpiringSoon(),
        isRenewalDue: subscription.isRenewalDue()
      }));
    } catch (error) {
      this.logger.error('Error fetching all subscriptions:', error);
      throw error;
    }
  }

  async getUserSubscriptionDetails(userId: number) {
    try {
      const user = await this.userModel.findByPk(userId, {
        attributes: ['id', 'name', 'email', 'phone', 'balance', 'createdAt']
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const subscriptions = await this.userSubscriptionModel.findAll({
        where: { userId },
        include: [
          {
            model: SubscriptionPlan,
            as: 'plan'
          },
          {
            model: SubscriptionPayment,
            as: 'payments',
            order: [['createdAt', 'DESC']]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const userTransactions = await this.transactionModel.findAll({
        where: { userId },
        order: [['transactionDate', 'DESC']],
        limit: 10
      });

      const userEmails = await this.emailModel.findAll({
        where: { senderUserId: userId },
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      return {
        user: user.get({ plain: true }),
        subscriptions: subscriptions.map(sub => ({
          ...sub.get({ plain: true }),
          isActive: sub.isActive(),
          isExpiringSoon: sub.isExpiringSoon(),
          isRenewalDue: sub.isRenewalDue()
        })),
        recentTransactions: userTransactions.map(t => t.get({ plain: true })),
        recentEmails: userEmails.map(e => e.get({ plain: true }))
      };
    } catch (error) {
      this.logger.error('Error fetching user subscription details:', error);
      throw error;
    }
  }

  async updateUserSubscription(subscriptionId: number, updates: {
    status?: SubscriptionStatus;
    autoRenew?: boolean;
    cancellationReason?: string;
  }) {
    try {
      const subscription = await this.userSubscriptionModel.findByPk(subscriptionId, {
        include: [
          { model: User, as: 'user' },
          { model: SubscriptionPlan, as: 'plan' }
        ]
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (updates.status === SubscriptionStatus.CANCELLED) {
        updates['cancelledAt'] = new Date();
        updates.autoRenew = false;
      }

      await subscription.update(updates);

      this.logger.log(`Subscription ${subscriptionId} updated by superadmin`);
      
      return {
        ...subscription.get({ plain: true }),
        isActive: subscription.isActive(),
        isExpiringSoon: subscription.isExpiringSoon(),
        isRenewalDue: subscription.isRenewalDue()
      };
    } catch (error) {
      this.logger.error('Error updating subscription:', error);
      throw error;
    }
  }

  async getSubscriptionStats() {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        totalRevenue
      ] = await Promise.all([
        this.userSubscriptionModel.count(),
        this.userSubscriptionModel.count({ where: { status: SubscriptionStatus.ACTIVE } }),
        this.userSubscriptionModel.count({ where: { status: SubscriptionStatus.CANCELLED } }),
        this.userSubscriptionModel.count({ where: { status: SubscriptionStatus.EXPIRED } }),
        this.subscriptionPaymentModel.sum('amount', { where: { status: 'completed' } })
      ]);

      // Get subscriptions expiring in next 7 days
      const expiringSoon = await this.userSubscriptionModel.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endDate: {
            [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
          }
        }
      });

      // Get monthly subscription trends
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const subscriptionsThisMonth = await this.userSubscriptionModel.count({
        where: {
          createdAt: { [Op.gte]: currentMonth }
        }
      });

      return {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        expiredSubscriptions,
        expiringSoon,
        subscriptionsThisMonth,
        totalRevenue: totalRevenue || 0
      };
    } catch (error) {
      this.logger.error('Error fetching subscription stats:', error);
      throw error;
    }
  }

  async getAllSubscriptionPlans() {
    try {
      const plans = await this.subscriptionPlanModel.findAll({
        order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
      });

      // Get subscription count for each plan
      const plansWithStats = await Promise.all(
        plans.map(async (plan) => {
          const subscriptionCount = await this.userSubscriptionModel.count({
            where: { planId: plan.id }
          });
          const activeSubscriptionCount = await this.userSubscriptionModel.count({
            where: { 
              planId: plan.id,
              status: SubscriptionStatus.ACTIVE 
            }
          });

          return {
            ...plan.get({ plain: true }),
            subscriptionCount,
            activeSubscriptionCount
          };
        })
      );

      return plansWithStats;
    } catch (error) {
      this.logger.error('Error fetching subscription plans:', error);
      throw error;
    }
  }

  async createSubscriptionPlan(planData: {
    name: string;
    description: string;
    price: number;
    billingCycle: string;
    features: any;
    emailLimit: number;
    transactionLimit: number;
    status: string;
    sortOrder: number;
  }) {
    try {
      const plan = await this.subscriptionPlanModel.create(planData as any);
      this.logger.log(`New subscription plan created: ${plan.name}`);
      return plan.get({ plain: true });
    } catch (error) {
      this.logger.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  async updateSubscriptionPlan(planId: number, updates: any) {
    try {
      const plan = await this.subscriptionPlanModel.findByPk(planId);
      if (!plan) {
        throw new NotFoundException('Subscription plan not found');
      }

      await plan.update(updates);
      this.logger.log(`Subscription plan ${planId} updated`);
      
      return plan.get({ plain: true });
    } catch (error) {
      this.logger.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  // Impersonation methods
  async startImpersonation(adminUserId: number, targetUserId: number) {
    try {
      // Verify admin user is actually a superadmin
      const adminUser = await this.userModel.findByPk(adminUserId);
      if (!adminUser || adminUser.role !== UserRole.SUPERADMIN) {
        throw new BadRequestException('Only superadmins can impersonate users');
      }

      // Verify target user exists and is not a superadmin
      const targetUser = await this.userModel.findByPk(targetUserId);
      if (!targetUser) {
        throw new NotFoundException('Target user not found');
      }

      if (targetUser.role === UserRole.SUPERADMIN) {
        throw new BadRequestException('Cannot impersonate another superadmin');
      }

      // Create impersonation token
      const impersonationPayload = {
        id: targetUser.id,
        sub: targetUser.id, // Standard JWT subject claim
        email: targetUser.email,
        role: targetUser.role,
        name: targetUser.name,
        originalUserId: adminUserId,
        isImpersonating: true,
        skipOTP: true, // Flag to bypass any OTP verification
        impersonatedBy: adminUser.email,
        impersonationStartTime: new Date().toISOString()
      };

      const impersonationToken = this.jwtService.sign(impersonationPayload, {
        expiresIn: '2h' // Impersonation sessions expire in 2 hours
      });

      // Log impersonation start
      this.createNotification(
        'security',
        'User Impersonation Started',
        `Superadmin ${adminUser.name} (${adminUser.email}) started impersonating ${targetUser.name} (${targetUser.email})`,
        targetUserId,
        targetUser.email
      );

      this.logger.log(`Superadmin ${adminUserId} started impersonating user ${targetUserId}`);

      return {
        impersonationToken,
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          phone: targetUser.phone,
          balance: targetUser.balance,
          role: targetUser.role,
          twoFactorEnabled: targetUser.twoFactorEnabled,
          createdAt: targetUser.createdAt,
          isImpersonated: true, // Mark as impersonated user
          skipOTP: true // Flag to bypass OTP verification
        },
        originalAdminToken: this.jwtService.sign({
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          name: adminUser.name
        }),
        message: 'Impersonation started successfully'
      };
    } catch (error) {
      this.logger.error('Error starting impersonation:', error);
      throw error;
    }
  }

  async stopImpersonation(originalAdminUserId: number) {
    try {
      const adminUser = await this.userModel.findByPk(originalAdminUserId);
      if (!adminUser || adminUser.role !== UserRole.SUPERADMIN) {
        throw new BadRequestException('Invalid admin user');
      }

      // Create new admin token
      const adminToken = this.jwtService.sign({
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        name: adminUser.name
      });

      // Log impersonation end
      this.createNotification(
        'security',
        'User Impersonation Ended',
        `Superadmin ${adminUser.name} (${adminUser.email}) ended user impersonation session`,
        originalAdminUserId,
        adminUser.email
      );

      this.logger.log(`Superadmin ${originalAdminUserId} ended impersonation session`);

      return {
        adminToken,
        adminUser: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          balance: adminUser.balance,
          role: adminUser.role
        }
      };
    } catch (error) {
      this.logger.error('Error stopping impersonation:', error);
      throw error;
    }
  }

  // Fee Configuration Management
  async getFeeConfigurationsForUser(userId: number, type?: FeeConfigurationType): Promise<FeeConfiguration[]> {
    const whereCondition: any = { userId };
    if (type) {
      whereCondition.type = type;
    }

    const findOptions: any = {
      where: whereCondition,
      include: type === FeeConfigurationType.SUBSCRIPTION ? [
        {
          model: this.subscriptionPlanModel,
          as: 'subscriptionPlan',
          attributes: ['id', 'name', 'description', 'price', 'billingCycle']
        }
      ] : [],
    };

    // Set the order condition based on type
    if (type === FeeConfigurationType.SUBSCRIPTION) {
      findOptions.order = [['subscriptionPlanId', 'ASC']];
    } else {
      findOptions.order = [['minAmount', 'ASC']];
    }

    return this.feeConfigurationModel.findAll(findOptions);
  }

  // Get subscription fee configurations for a user
  async getSubscriptionFeeConfigurationsForUser(userId: number): Promise<FeeConfiguration[]> {
    try {
      return this.feeConfigurationModel.findAll({
        where: { 
          userId,
          type: FeeConfigurationType.SUBSCRIPTION 
        },
        include: [
          {
            model: this.subscriptionPlanModel,
            attributes: ['id', 'name', 'description', 'price', 'billingCycle']
          }
        ],
        order: [['subscriptionPlanId', 'ASC']],
      });
    } catch (error) {
      this.logger.error('Error fetching subscription fee configurations:', error);
      throw error;
    }
  }

  // Get send money fee configurations for a user
  async getSendMoneyFeeConfigurationsForUser(userId: number): Promise<FeeConfiguration[]> {
    try {
      return this.feeConfigurationModel.findAll({
        where: { 
          userId,
          type: FeeConfigurationType.SEND_MONEY 
        },
        order: [['minAmount', 'ASC']],
      });
    } catch (error) {
      this.logger.error('Error fetching send money fee configurations:', error);
      throw error;
    }
  }

  // Get add money fee configurations for a user
  async getAddMoneyFeeConfigurationsForUser(userId: number): Promise<FeeConfiguration[]> {
    try {
      return this.feeConfigurationModel.findAll({
        where: { 
          userId,
          type: FeeConfigurationType.ADD_MONEY 
        },
        order: [['minAmount', 'ASC']],
      });
    } catch (error) {
      this.logger.error('Error fetching add money fee configurations:', error);
      throw error;
    }
  }

  // Get available subscription plans for fee configuration (plans without existing configs for this user)
  async getAvailableSubscriptionPlansForFeeConfig(userId: number): Promise<any[]> {
    try {
      // Get all subscription plans that are active and match our current billing cycles
      const availablePlans = await this.subscriptionPlanModel.findAll({
        where: {
          status: 'active',
          billingCycle: ['monthly', 'quarterly', 'annually']
        },
        order: [
          [Sequelize.literal(`CASE 
            WHEN billingCycle = 'monthly' THEN 1 
            WHEN billingCycle = 'quarterly' THEN 2 
            WHEN billingCycle = 'annually' THEN 3 
            ELSE 4 
          END`), 'ASC'],
          ['price', 'ASC']
        ],
        attributes: [
          'id',
          'name',
          'description',
          'price',
          'billingCycle',
          'emailQuota',
          'transactionLimit'
        ]
      });

      // Get existing fee configurations for this user
      const existingConfigs = await this.feeConfigurationModel.findAll({
        where: {
          userId,
          type: FeeConfigurationType.SUBSCRIPTION
        },
        attributes: ['subscriptionPlanId']
      });

      const existingPlanIds = existingConfigs.map(config => config.subscriptionPlanId);

      // Filter out plans that already have fee configurations
      return availablePlans
        .filter(plan => !existingPlanIds.includes(plan.id))
        .map(plan => plan.get({ plain: true }));
    } catch (error) {
      this.logger.error('Error fetching available subscription plans:', error);
      throw error;
    }
  }

  async createFeeConfiguration(userId: number, dto: FeeConfigurationDto): Promise<FeeConfiguration> {
    await this.validateUserExists(userId);
    return this.feeConfigurationModel.create({ ...dto, userId } as any);
  }

  async updateFeeConfiguration(feeId: number, dto: FeeConfigurationDto): Promise<[number, FeeConfiguration[]]> {
    const feeConfig = await this.feeConfigurationModel.findByPk(feeId);
    if (!feeConfig) {
      throw new NotFoundException(`Fee configuration with ID ${feeId} not found`);
    }
    return this.feeConfigurationModel.update(dto, {
      where: { id: feeId },
      returning: true,
    });
  }

  async deleteFeeConfiguration(feeId: number): Promise<void> {
    const feeConfig = await this.feeConfigurationModel.findByPk(feeId);
    if (!feeConfig) {
      throw new NotFoundException(`Fee configuration with ID ${feeId} not found`);
    }
    await feeConfig.destroy();
  }

  async bulkUpdateFeeConfigurations(userId: number, dto: BulkFeeConfigurationDto, feeType?: FeeConfigurationType, changedByUserId?: number): Promise<{ message: string, feeConfigurations: FeeConfiguration[] }> {
    // Validate user exists
    await this.validateUserExists(userId);

    // Default changedByUserId to userId if not provided (for backward compatibility)
    const changeByUser = changedByUserId || userId;

    // Start transaction for consistency
    const transaction = await this.feeConfigurationModel.sequelize?.transaction();
    
    try {
      // Determine configuration type
      let configurationType: FeeConfigurationType;
      
      if (dto.feeConfigurations.length > 0) {
        configurationType = dto.feeConfigurations[0].type;
      } else if (feeType) {
        configurationType = feeType;
      } else {
        // Default to SEND_MONEY for backward compatibility
        configurationType = FeeConfigurationType.SEND_MONEY;
      }

      // Handle case where all configurations are being deleted
      if (dto.feeConfigurations.length === 0) {
        // Get existing configurations to create deletion versions
        const existingConfigs = await this.feeConfigurationModel.findAll({
          where: { 
            userId,
            type: configurationType 
          },
          transaction
        });

        // Delete all existing configurations for this user and type
        await this.feeConfigurationModel.destroy({
          where: { 
            userId,
            type: configurationType 
          },
          transaction
        });

        // Commit transaction first
        await transaction?.commit();

        // Create version records outside of transaction
        const versions: FeeConfigurationVersion[] = [];
        for (const config of existingConfigs) {
          try {
            const version = await this.createFeeConfigurationVersion(
              VersionAction.DELETED,
              userId,
              configurationType,
              changeByUser,
              config.id,
              {
                fee: config.fee,
                minAmount: config.minAmount,
                maxAmount: config.maxAmount,
                subscriptionPlanId: config.subscriptionPlanId
              },
              null,
              'All fee configurations deleted'
            );
            versions.push(version);
          } catch (error) {
            this.logger.warn(`Failed to create version record for deleted config ${config.id}: ${error.message}`);
          }
        }

        // Increment global semantic version if any changes were made
        if (versions.length > 0) {
          try {
            const changeDescription = `Fee configuration changes: ${versions.map(v => v.action.toLowerCase()).join(', ')}`;
            await this.incrementGlobalFeeVersion(userId, [configurationType], changeDescription, changeByUser, 'minor');
          } catch (error) {
            this.logger.warn(`Failed to increment global semantic version for user ${userId}: ${error.message}`);
          }
        }

        // Send notifications after version records are created
        for (const version of versions) {
          try {
            await this.notifyUserOfFeeChanges(userId, version);
          } catch (error) {
            this.logger.warn(`Failed to send notification for version ${version.id}: ${error.message}`);
          }
        }
        
        this.logger.log(`All ${configurationType} fee configurations deleted for user ${userId}`);
        
        return {
          message: 'All fee configurations deleted successfully',
          feeConfigurations: []
        };
      }

      // Get existing configurations for this user and type
      const existingConfigs = await this.feeConfigurationModel.findAll({
        where: { 
          userId,
          type: configurationType 
        },
        transaction
      });

      const existingConfigIds = existingConfigs.map(config => config.id);
      const updatedConfigIds: number[] = [];
      const createdVersions: FeeConfigurationVersion[] = [];

      // Process each configuration in the DTO
      for (const configDto of dto.feeConfigurations) {
        // Validate configuration data
        if (configDto.type === FeeConfigurationType.SEND_MONEY || configDto.type === FeeConfigurationType.ADD_MONEY) {
          if (configDto.minAmount === undefined || configDto.maxAmount === undefined) {
            throw new BadRequestException('Min and max amounts are required for send money and add money fee configurations');
          }
          if (configDto.minAmount < 0) {
            throw new BadRequestException(`Minimum amount (${configDto.minAmount}) must be greater than or equal to 0`);
          }
          if (configDto.maxAmount <= configDto.minAmount) {
            throw new BadRequestException(`Maximum amount (${configDto.maxAmount}) must be greater than minimum amount (${configDto.minAmount})`);
          }
          if (configDto.fee < 0) {
            throw new BadRequestException(`Fee amount (${configDto.fee}) cannot be negative`);
          }
        }

        if (configDto.id) {
          // Update existing configuration
          const existingConfig = existingConfigs.find(config => config.id === configDto.id);
          if (!existingConfig) {
            throw new NotFoundException(`Fee configuration with ID ${configDto.id} not found`);
          }

          // Store previous values for version tracking
          const previousValues = {
            fee: existingConfig.fee,
            minAmount: existingConfig.minAmount,
            maxAmount: existingConfig.maxAmount,
            subscriptionPlanId: existingConfig.subscriptionPlanId
          };

          const currentValues = {
            fee: configDto.fee,
            minAmount: configDto.minAmount,
            maxAmount: configDto.maxAmount,
            subscriptionPlanId: configDto.subscriptionPlanId
          };
          
          await existingConfig.update({
            type: configDto.type,
            minAmount: configDto.minAmount,
            maxAmount: configDto.maxAmount,
            subscriptionPlanId: configDto.subscriptionPlanId,
            fee: configDto.fee
          }, { transaction });

          // Store version data to create after transaction
          createdVersions.push({
            action: VersionAction.UPDATED,
            userId,
            type: configurationType,
            changedByUserId: changeByUser,
            feeConfigurationId: configDto.id,
            previousValues,
            currentValues,
            changeReason: 'Fee configuration updated'
          } as any);
          
          updatedConfigIds.push(configDto.id);
        } else {
          // Create new configuration
          const newConfig = await this.feeConfigurationModel.create({
            userId,
            type: configDto.type,
            minAmount: configDto.minAmount,
            maxAmount: configDto.maxAmount,
            subscriptionPlanId: configDto.subscriptionPlanId,
            fee: configDto.fee
          } as any, { transaction });

          // Store version data to create after transaction
          const currentValues = {
            fee: configDto.fee,
            minAmount: configDto.minAmount,
            maxAmount: configDto.maxAmount,
            subscriptionPlanId: configDto.subscriptionPlanId
          };

          createdVersions.push({
            action: VersionAction.CREATED,
            userId,
            type: configurationType,
            changedByUserId: changeByUser,
            feeConfigurationId: newConfig.id,
            previousValues: null,
            currentValues,
            changeReason: 'New fee configuration created'
          } as any);
          
          updatedConfigIds.push(newConfig.id);
        }
      }

      // Delete configurations that weren't included in the update
      const configsToDelete = existingConfigIds.filter(id => !updatedConfigIds.includes(id));
      if (configsToDelete.length > 0) {
        // Store version data for deleted configurations
        const deletedConfigs = existingConfigs.filter(config => configsToDelete.includes(config.id));
        for (const deletedConfig of deletedConfigs) {
          createdVersions.push({
            action: VersionAction.DELETED,
            userId,
            type: configurationType,
            changedByUserId: changeByUser,
            feeConfigurationId: deletedConfig.id,
            previousValues: {
              fee: deletedConfig.fee,
              minAmount: deletedConfig.minAmount,
              maxAmount: deletedConfig.maxAmount,
              subscriptionPlanId: deletedConfig.subscriptionPlanId
            },
            currentValues: null,
            changeReason: 'Fee configuration deleted during bulk update'
          } as any);
        }

        await this.feeConfigurationModel.destroy({
          where: { id: configsToDelete },
          transaction
        });
      }

      // Commit transaction
      await transaction?.commit();

      // Create version records outside of transaction to avoid locks
      const actualVersions: FeeConfigurationVersion[] = [];
      for (const versionData of createdVersions) {
        try {
          const version = await this.createFeeConfigurationVersion(
            versionData.action,
            versionData.userId,
            versionData.type,
            versionData.changedByUserId,
            versionData.feeConfigurationId,
            versionData.previousValues,
            versionData.currentValues,
            versionData.changeReason
          );
          actualVersions.push(version);
        } catch (error) {
          this.logger.warn(`Failed to create version record: ${error.message}`);
        }
      }

      // Increment global semantic version if any changes were made
      if (actualVersions.length > 0) {
        try {
          const changeDescription = `Fee configuration changes: ${actualVersions.map(v => v.action.toLowerCase()).join(', ')}`;
          await this.incrementGlobalFeeVersion(userId, [configurationType], changeDescription, changeByUser, 'minor');
        } catch (error) {
          this.logger.warn(`Failed to increment global semantic version for user ${userId}: ${error.message}`);
        }
      }

      // Send notifications after version records are created
      for (const version of actualVersions) {
        try {
          await this.notifyUserOfFeeChanges(userId, version);
        } catch (error) {
          this.logger.warn(`Failed to send notification for version ${version.id}: ${error.message}`);
        }
      }

      // Fetch and return updated configurations
      const updatedConfigs = await this.feeConfigurationModel.findAll({
        where: { 
          userId,
          type: configurationType 
        },
        include: configurationType === FeeConfigurationType.SUBSCRIPTION ? [
          {
            model: this.subscriptionPlanModel,
            as: 'subscriptionPlan',
            attributes: ['id', 'name', 'description', 'price', 'billingCycle']
          }
        ] : [],
        order: configurationType === FeeConfigurationType.SUBSCRIPTION ? 
          [['subscriptionPlanId', 'ASC']] : 
          [['minAmount', 'ASC']]
      });

      this.logger.log(`Bulk updated ${dto.feeConfigurations.length} fee configurations for user ${userId}, type: ${configurationType}`);
      
      return {
        message: 'Fee configurations updated successfully',
        feeConfigurations: updatedConfigs
      };

    } catch (error) {
      // Rollback transaction on error
      await transaction?.rollback();
      this.logger.error('Error in bulk fee configuration update:', error);
      throw error;
    }
  }

  private async validateUserExists(userId: number) {
    const user = await this.userModel.findByPk(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  // Default Fee Configuration Management
  async getDefaultFeeConfiguration(): Promise<DefaultFeeConfiguration> {
    const config = await this.defaultFeeConfigurationModel.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });

    if (!config) {
      // Create default configuration if none exists
      return await this.defaultFeeConfigurationModel.create({
        feeAmount: 10.00,
        feeType: FeeType.FIXED,
        minAmount: 0.00,
        maxAmount: undefined,
        isActive: true,
        description: 'Default transaction fee for all money transfers'
      } as any);
    }

    return config;
  }

  async createDefaultFeeConfiguration(dto: CreateDefaultFeeConfigurationDto): Promise<DefaultFeeConfiguration> {
    // Deactivate existing active configurations
    await this.defaultFeeConfigurationModel.update(
      { isActive: false },
      { where: { isActive: true } }
    );

    return await this.defaultFeeConfigurationModel.create(dto as any);
  }

  async updateDefaultFeeConfiguration(configId: number, dto: UpdateDefaultFeeConfigurationDto): Promise<DefaultFeeConfiguration> {
    const config = await this.defaultFeeConfigurationModel.findByPk(configId);
    if (!config) {
      throw new NotFoundException('Default fee configuration not found');
    }

    await config.update(dto);
    return config;
  }

  async toggleUserDefaultFee(userId: number, dto: ToggleUserDefaultFeeDto): Promise<{ message: string }> {
    await this.validateUserExists(userId);
    
    await this.userModel.update(
      { defaultFeeEnabled: dto.defaultFeeEnabled },
      { where: { id: userId } }
    );

    return { 
      message: `Default fee ${dto.defaultFeeEnabled ? 'enabled' : 'disabled'} for user` 
    };
  }

  async getUserDefaultFeeStatus(userId: number): Promise<{ defaultFeeEnabled: boolean }> {
    const user = await this.userModel.findByPk(userId, {
      attributes: ['defaultFeeEnabled']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { defaultFeeEnabled: user.defaultFeeEnabled };
  }

  // Calculate applicable fee for a transaction
  async calculateApplicableFee(userId: number, amount: number): Promise<{ fee: number; source: string }> {
    // First check for user-specific fee configuration
    const userFeeConfig = await this.feeConfigurationModel.findOne({
      where: { 
        userId: userId,
        minAmount: { [Op.lte]: amount },
        maxAmount: { [Op.gte]: amount }
      },
      order: [['minAmount', 'DESC']]
    });

    if (userFeeConfig) {
      return { fee: Number(userFeeConfig.fee), source: 'user_specific' };
    }

    // Check if user has default fee enabled
    const user = await this.userModel.findByPk(userId, {
      attributes: ['defaultFeeEnabled']
    });

    if (!user || !user.defaultFeeEnabled) {
      return { fee: 0, source: 'none' };
    }

    // Get default fee configuration
    const defaultFeeConfig = await this.getDefaultFeeConfiguration();
    
    if (amount < defaultFeeConfig.minAmount || 
        (defaultFeeConfig.maxAmount && amount > defaultFeeConfig.maxAmount)) {
      return { fee: 0, source: 'out_of_range' };
    }

    const fee = defaultFeeConfig.feeType === FeeType.PERCENTAGE
      ? (amount * defaultFeeConfig.feeAmount) / 100
      : defaultFeeConfig.feeAmount;

    return { fee: Number(fee), source: 'default' };
  }

  // Calculate applicable fee for add money operation
  async calculateAddMoneyFee(userId: number, amount: number): Promise<{ fee: number; source: string }> {
    // First check for user-specific add money fee configuration
    const userFeeConfig = await this.feeConfigurationModel.findOne({
      where: { 
        userId: userId,
        type: FeeConfigurationType.ADD_MONEY,
        minAmount: { [Op.lte]: amount },
        maxAmount: { [Op.gte]: amount }
      },
      order: [['minAmount', 'DESC']]
    });

    if (userFeeConfig) {
      return { fee: Number(userFeeConfig.fee), source: 'user_specific_add_money' };
    }

    // Check if user has default fee enabled
    const user = await this.userModel.findByPk(userId, {
      attributes: ['defaultFeeEnabled']
    });

    if (!user || !user.defaultFeeEnabled) {
      return { fee: 0, source: 'none' };
    }

    // Get default fee configuration
    const defaultFeeConfig = await this.getDefaultFeeConfiguration();
    
    if (amount < defaultFeeConfig.minAmount || 
        (defaultFeeConfig.maxAmount && amount > defaultFeeConfig.maxAmount)) {
      return { fee: 0, source: 'out_of_range' };
    }

    const fee = defaultFeeConfig.feeType === FeeType.PERCENTAGE
      ? (amount * defaultFeeConfig.feeAmount) / 100
      : defaultFeeConfig.feeAmount;

    return { fee: Number(fee), source: 'default_add_money' };
  }

  /**
   * Finds the applicable fee configuration for a given amount
   * Uses inclusive bounds (minAmount ≤ amount ≤ maxAmount)
   * @param amount The transaction amount
   * @param userId Optional user ID to get specific fee configuration
   * @returns The applicable fee configuration or null if none found
   */
  async findApplicableFeeConfiguration(
    amount: number,
    userId?: number,
  ): Promise<FeeConfiguration | null> {
    const whereClause: any = {
      minAmount: { [Op.lte]: amount },
      maxAmount: { [Op.gte]: amount },
      type: FeeConfigurationType.SEND_MONEY
    };

    if (userId) {
      whereClause.userId = userId;
    }

    return await this.feeConfigurationModel.findOne({
      where: whereClause,
      order: [['minAmount', 'ASC']] // Ensures we get the lower range when amount is at boundary
    });
  }

  /**
   * Gets the applicable fee amount for a transaction
   * @param amount The transaction amount
   * @param userId Optional user ID to get specific fee amount
   * @returns The fee amount or null if no applicable fee found
   */
  async getApplicableFeeAmount(
    amount: number,
    userId?: number,
  ): Promise<number | null> {
    const feeConfig = await this.findApplicableFeeConfiguration(amount, userId);
    return feeConfig?.fee ?? null;
  }

  // Fee Configuration Versioning Methods
  private async createFeeConfigurationVersion(
    action: VersionAction,
    userId: number,
    type: FeeConfigurationType,
    changedByUserId: number,
    feeConfigurationId?: number,
    previousValues?: any,
    currentValues?: any,
    changeReason?: string
  ): Promise<FeeConfigurationVersion> {
    // Get the latest version number for this user and type
    const latestVersion = await this.feeConfigurationVersionModel.findOne({
      where: { userId, type },
      order: [['version', 'DESC']]
    });

    const version = latestVersion ? latestVersion.version + 1 : 1;

    return this.feeConfigurationVersionModel.create({
      feeConfigurationId,
      userId,
      version,
      action,
      type,
      previousValues,
      currentValues,
      changedByUserId,
      changeReason,
      userNotified: false
    } as any);
  }

  private async createUserNotification(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    feeConfigurationVersionId?: number,
    metadata?: any
  ): Promise<UserNotification> {
    return this.userNotificationModel.create({
      userId,
      type,
      title,
      message,
      status: NotificationStatus.UNREAD,
      feeConfigurationVersionId,
      metadata,
      emailSent: false
    } as any);
  }

  private async sendFeeChangeNotificationEmail(
    user: User,
    notification: UserNotification,
    feeConfigurationVersion: FeeConfigurationVersion
  ): Promise<void> {
    try {
      const previousValues = feeConfigurationVersion.previousValues;
      const currentValues = feeConfigurationVersion.currentValues;
      
      let changeDescription = '';
      if (feeConfigurationVersion.action === VersionAction.CREATED) {
        changeDescription = `A new ${feeConfigurationVersion.type.replace('_', ' ')} fee has been added to your account.`;
      } else if (feeConfigurationVersion.action === VersionAction.UPDATED) {
        changeDescription = `Your ${feeConfigurationVersion.type.replace('_', ' ')} fee has been updated.`;
        if (previousValues && currentValues) {
          if (previousValues.fee !== currentValues.fee) {
            changeDescription += ` Fee amount changed from ${previousValues.fee} to ${currentValues.fee}.`;
          }
          if (previousValues.minAmount !== currentValues.minAmount || previousValues.maxAmount !== currentValues.maxAmount) {
            changeDescription += ` Amount range updated.`;
          }
        }
      } else if (feeConfigurationVersion.action === VersionAction.DELETED) {
        changeDescription = `A ${feeConfigurationVersion.type.replace('_', ' ')} fee has been removed from your account.`;
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #4a5568; color: white; padding: 20px;">
            <h2 style="margin: 0;">Fee Configuration Update</h2>
          </div>
          <div style="padding: 20px;">
            <p>Dear ${user.name},</p>
            <p>We're writing to inform you about changes to your fee configuration.</p>
            
            <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">What Changed:</h3>
              <p>${changeDescription}</p>
              
              ${currentValues ? `
                <h4>Current Configuration:</h4>
                <ul>
                  ${currentValues.fee ? `<li>Fee Amount: ${currentValues.fee}</li>` : ''}
                  ${currentValues.minAmount !== undefined ? `<li>Minimum Amount: ${currentValues.minAmount}</li>` : ''}
                  ${currentValues.maxAmount !== undefined ? `<li>Maximum Amount: ${currentValues.maxAmount}</li>` : ''}
                </ul>
              ` : ''}
            </div>

            <p>These changes are effective immediately and will apply to all future transactions.</p>
            <p>If you have any questions about these changes, please contact our support team.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>Your Banking System</p>
          </div>
          <div style="background-color: #f7fafc; padding: 15px; text-align: center; color: #718096; font-size: 12px;">
            This is an automated notification. Please do not reply to this email.
          </div>
        </div>
      `;

      await this.emailsService.sendEmail({
        to: user.email,
        subject: `Fee Configuration Update - ${feeConfigurationVersion.type.replace('_', ' ')} Fee`,
        html: htmlContent
      });

      // Update notification as email sent
      await notification.update({
        emailSent: true,
        emailSentAt: new Date()
      });

      // Update version as user notified
      await feeConfigurationVersion.update({
        userNotified: true,
        notifiedAt: new Date()
      });

      this.logger.log(`Fee change notification email sent to user ${user.id} (${user.email})`);
    } catch (error) {
      this.logger.error(`Failed to send fee change notification email to user ${user.id}:`, error);
    }
  }

  async notifyUserOfFeeChanges(
    userId: number,
    feeConfigurationVersion: FeeConfigurationVersion
  ): Promise<void> {
    try {
      const user = await this.userModel.findByPk(userId);
      if (!user) {
        this.logger.error(`User ${userId} not found for fee change notification`);
        return;
      }

      let notificationType: NotificationType;
      let title: string;
      let message: string;

      switch (feeConfigurationVersion.action) {
        case VersionAction.CREATED:
          notificationType = NotificationType.FEE_ADDED;
          title = 'New Fee Configuration Added';
          message = `A new ${feeConfigurationVersion.type.replace('_', ' ')} fee has been added to your account.`;
          break;
        case VersionAction.UPDATED:
          notificationType = NotificationType.FEE_CHANGE;
          title = 'Fee Configuration Updated';
          message = `Your ${feeConfigurationVersion.type.replace('_', ' ')} fee configuration has been updated.`;
          break;
        case VersionAction.DELETED:
          notificationType = NotificationType.FEE_REMOVED;
          title = 'Fee Configuration Removed';
          message = `A ${feeConfigurationVersion.type.replace('_', ' ')} fee has been removed from your account.`;
          break;
      }

      // Create user notification
      const notification = await this.createUserNotification(
        userId,
        notificationType,
        title,
        message,
        feeConfigurationVersion.id,
        {
          feeType: feeConfigurationVersion.type,
          action: feeConfigurationVersion.action,
          version: feeConfigurationVersion.version
        }
      );

      // Send email notification
      await this.sendFeeChangeNotificationEmail(user, notification, feeConfigurationVersion);

    } catch (error) {
      this.logger.error(`Error notifying user ${userId} of fee changes:`, error);
    }
  }

  // Global Fee Versioning Methods
  async getCurrentGlobalFeeVersion(userId: number): Promise<GlobalFeeVersion> {
    let globalFeeVersion = await this.globalFeeVersionModel.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'changedByUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Create initial version if it doesn't exist
    if (!globalFeeVersion) {
      globalFeeVersion = await this.globalFeeVersionModel.create({
        userId,
        version: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        changeDescription: 'Initial fee configuration setup',
        affectedFeeTypes: []
      } as any);
    }

    return globalFeeVersion;
  }

  async incrementGlobalFeeVersion(
    userId: number, 
    affectedFeeTypes: string[],
    changeDescription: string,
    changedByUserId?: number,
    versionType: 'major' | 'minor' | 'patch' = 'minor'
  ): Promise<GlobalFeeVersion> {
    const globalFeeVersion = await this.getCurrentGlobalFeeVersion(userId);
    
    // Increment version based on type
    switch (versionType) {
      case 'major':
        globalFeeVersion.incrementMajorVersion();
        break;
      case 'minor':
        globalFeeVersion.incrementMinorVersion();
        break;
      case 'patch':
        globalFeeVersion.incrementPatchVersion();
        break;
    }
    
    globalFeeVersion.changeDescription = changeDescription;
    globalFeeVersion.changedByUserId = changedByUserId || userId;
    globalFeeVersion.affectedFeeTypes = affectedFeeTypes;
    
    await globalFeeVersion.save();

    this.logger.log(`Global fee version incremented for user ${userId}: ${globalFeeVersion.version} (affected: ${affectedFeeTypes.join(', ')})`);
    return globalFeeVersion;
  }

  // Legacy Fee Versioning Methods (kept for backward compatibility)
  async getCurrentFeeVersion(userId: number, feeType: FeeConfigurationType): Promise<FeeVersion> {
    let feeVersion = await this.feeVersionModel.findOne({
      where: {
        userId,
        feeType
      }
    });

    // Create initial version if it doesn't exist
    if (!feeVersion) {
      feeVersion = await this.feeVersionModel.create({
        userId,
        feeType,
        version: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        changeDescription: 'Initial fee configuration setup'
      } as any);
    }

    return feeVersion;
  }

  async incrementFeeVersion(
    userId: number, 
    feeType: FeeConfigurationType, 
    changeDescription: string,
    changedByUserId?: number
  ): Promise<FeeVersion> {
    // Use global versioning instead of fee-type specific versioning
    await this.incrementGlobalFeeVersion(
      userId,
      [feeType],
      changeDescription,
      changedByUserId,
      'minor'
    );

    // Return the legacy fee version for compatibility
    return this.getCurrentFeeVersion(userId, feeType);
  }

  async getAllFeeVersionsForUser(userId: number): Promise<FeeVersion[]> {
    return this.feeVersionModel.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });
  }

  async getFeeVersionHistory(userId: number, feeType: FeeConfigurationType): Promise<FeeVersion[]> {
    return this.feeVersionModel.findAll({
      where: { userId, feeType },
      order: [['createdAt', 'DESC']]
    });
  }

  // Global Fee Version Management Methods for Superadmin
  async getAllGlobalFeeVersions(): Promise<GlobalFeeVersion[]> {
    return this.globalFeeVersionModel.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'changedByUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
  }

  async getGlobalFeeVersionForUser(userId: number): Promise<GlobalFeeVersion> {
    return this.getCurrentGlobalFeeVersion(userId);
  }

  async setGlobalFeeVersion(
    userId: number,
    version: string,
    changeDescription: string,
    changedByUserId: number
  ): Promise<GlobalFeeVersion> {
    const globalFeeVersion = await this.getCurrentGlobalFeeVersion(userId);
    
    globalFeeVersion.setVersionFromString(version);
    globalFeeVersion.changeDescription = changeDescription;
    globalFeeVersion.changedByUserId = changedByUserId;
    globalFeeVersion.affectedFeeTypes = ['send_money', 'add_money', 'subscription']; // All fee types affected by manual version change
    
    await globalFeeVersion.save();

    this.logger.log(`Global fee version manually set for user ${userId}: ${globalFeeVersion.version} by admin ${changedByUserId}`);
    return globalFeeVersion;
  }

  async resetGlobalFeeVersion(
    userId: number,
    changeDescription: string,
    changedByUserId: number
  ): Promise<GlobalFeeVersion> {
    const globalFeeVersion = await this.getCurrentGlobalFeeVersion(userId);
    
    globalFeeVersion.setVersionFromString('1.0.0');
    globalFeeVersion.changeDescription = changeDescription;
    globalFeeVersion.changedByUserId = changedByUserId;
    globalFeeVersion.affectedFeeTypes = ['send_money', 'add_money', 'subscription'];
    
    await globalFeeVersion.save();

    this.logger.log(`Global fee version reset for user ${userId} by admin ${changedByUserId}`);
    return globalFeeVersion;
  }

  async bulkIncrementGlobalFeeVersions(
    userIds: number[],
    versionType: 'major' | 'minor' | 'patch',
    changeDescription: string,
    changedByUserId: number
  ): Promise<GlobalFeeVersion[]> {
    const updatedVersions: GlobalFeeVersion[] = [];

    for (const userId of userIds) {
      try {
        const updatedVersion = await this.incrementGlobalFeeVersion(
          userId,
          ['send_money', 'add_money', 'subscription'],
          changeDescription,
          changedByUserId,
          versionType
        );
        updatedVersions.push(updatedVersion);
      } catch (error) {
        this.logger.warn(`Failed to increment global version for user ${userId}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk incremented global fee versions for ${updatedVersions.length} users by admin ${changedByUserId}`);
    return updatedVersions;
  }
} 