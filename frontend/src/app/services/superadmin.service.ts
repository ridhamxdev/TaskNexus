import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  balance: number;
  role: string;
  createdAt: string;
  status: 'Active' | 'Inactive';
}

interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  transactionDate: string;
  user: {
    name: string;
    email: string;
  };
}

interface Email {
  id: number;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  sentAt: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  attempts?: number;
  failureReason?: string;
  sender?: {
    name: string;
    email: string;
  };
}

interface Subscription {
  id: number;
  userId: number;
  planId: number;
  status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'pending' | 'suspended';
  startDate: string;
  endDate: string;
  nextBillingDate?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  autoRenew: boolean;
  emailsUsed: number;
  transactionsUsed: number;
  isActive: boolean;
  isExpiringSoon: boolean;
  isRenewalDue: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    balance: number;
  };
  plan: {
    id: number;
    name: string;
    price: number;
    billingCycle: string;
    features: any;
    emailLimit?: number;
    transactionLimit?: number;
  };
  payments?: any[];
}

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingCycle: string;
  features: any;
  emailLimit: number;
  transactionLimit: number;
  status: string;
  sortOrder: number;
  subscriptionCount: number;
  activeSubscriptionCount: number;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  expiringSoon: number;
  subscriptionsThisMonth: number;
  totalRevenue: number;
}

interface UserSubscriptionDetails {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    balance: number;
    createdAt: string;
  };
  subscriptions: Subscription[];
  recentTransactions: Transaction[];
  recentEmails: Email[];
}

interface DashboardStats {
  totalUsers: number;
  totalTransactions: number;
  totalEmails: number;
  satisfactionRate: number;
  monthlyGrowth: number;
  newUsersThisMonth: number;
}

interface Settings {
  dailyDeductionAmount: number;
  emailNotifications: {
    transactions: boolean;
    dailyDeductions: boolean;
  };
  lastUpdated?: string;
}

interface Notification {
  id: number;
  type: 'transaction' | 'subscription' | 'email' | 'user' | 'login' | 'system' | 'security';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  relatedId?: number;
  userEmail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SuperadminService {
  private apiUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    console.log('Getting headers - token present:', !!token);
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
    } else {
      console.warn('No authentication token found!');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const headers = this.getHeaders();
      console.log('Fetching dashboard stats from API...');
      const response = await firstValueFrom(
        this.http.get<DashboardStats>(`${this.apiUrl}/superadmin/stats`, { headers })
      );
      console.log('Successfully fetched dashboard stats:', response);
      return response;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      console.error('Full error details:', {
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        message: (error as any)?.message,
        url: `${this.apiUrl}/superadmin/stats`
      });
      
      throw new Error('Failed to fetch dashboard stats from database');
    }
  }

  // User Management
  async getAllUsers(): Promise<User[]> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<User[]>(`${this.apiUrl}/superadmin/users`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users from database');
    }
  }

  async updateUserStatus(userId: number, status: 'Active' | 'Inactive'): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/superadmin/users/${userId}/status`, { status }, { headers })
      );
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async updateUserRole(userId: number, role: string): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/superadmin/users/${userId}/role`, { role }, { headers })
      );
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  // Transaction Management
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<Transaction[]>(`${this.apiUrl}/superadmin/transactions`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions from database');
    }
  }

  // Email Management
  async getAllEmails(): Promise<Email[]> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<Email[]>(`${this.apiUrl}/superadmin/emails`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw new Error('Failed to fetch emails from database');
    }
  }

  async resendEmail(emailId: number): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/superadmin/emails/${emailId}/resend`, {}, { headers })
      );
    } catch (error) {
      console.error('Error resending email:', error);
      throw error;
    }
  }

  // Settings Management
  async getSettings(): Promise<Settings> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<Settings>(`${this.apiUrl}/superadmin/settings`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Return default settings if API call fails
      return {
        dailyDeductionAmount: 50,
        emailNotifications: {
          transactions: true,
          dailyDeductions: true
        }
      };
    }
  }

  async updateSettings(settings: Settings): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/superadmin/settings`, settings, { headers })
      );
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Notifications Management
  async getAllNotifications(): Promise<Notification[]> {
    try {
      const headers = this.getHeaders();
      console.log('Fetching notifications from API...');
      const response = await firstValueFrom(
        this.http.get<Notification[]>(`${this.apiUrl}/superadmin/notifications`, { headers })
      );
      console.log('Successfully fetched notifications:', response.length, 'notifications');
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      console.error('Full error details:', {
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        message: (error as any)?.message
      });
      
      // Try to use real data, only fall back to mock if no other option
      console.warn('Falling back to mock notifications due to API error');
      return this.getMockNotifications();
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/superadmin/notifications/${notificationId}/read`, {}, { headers })
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllNotificationsAsRead(): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/superadmin/notifications/mark-all-read`, {}, { headers })
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  async createNotification(notification: Partial<Notification>): Promise<Notification> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.post<Notification>(`${this.apiUrl}/superadmin/notifications`, notification, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error creating notification:', error);
      // Return a mock notification for now
      return {
        id: Date.now(),
        type: notification.type as any,
        title: notification.title || '',
        message: notification.message || '',
        createdAt: notification.createdAt || new Date().toISOString(),
        isRead: false,
        relatedId: notification.relatedId,
        userEmail: notification.userEmail
      };
    }
  }

  private getMockNotifications(): Notification[] {
    const now = new Date();
    return [
      {
        id: 1,
        type: 'subscription',
        title: 'New Subscription',
        message: 'John Doe (john@example.com) subscribed to Premium Plan',
        createdAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        isRead: false,
        relatedId: 456,
        userEmail: 'john@example.com'
      },
      {
        id: 2,
        type: 'transaction',
        title: 'Large Transaction Alert',
        message: 'User john@example.com made a ₹5,000 transaction',
        createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        isRead: false,
        relatedId: 123,
        userEmail: 'john@example.com'
      },
      {
        id: 3,
        type: 'email',
        title: 'Email Sent',
        message: 'Sarah Wilson sent marketing email to 150 recipients',
        createdAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        isRead: false,
        relatedId: 789,
        userEmail: 'sarah@example.com'
      },
      {
        id: 4,
        type: 'user',
        title: 'New User Registration',
        message: 'New user Mike Johnson (mike@example.com) registered',
        createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        isRead: false,
        relatedId: 321,
        userEmail: 'mike@example.com'
      },
      {
        id: 5,
        type: 'subscription',
        title: 'Subscription Cancelled',
        message: 'Alice Brown cancelled her Basic Plan subscription',
        createdAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        isRead: false,
        relatedId: 654,
        userEmail: 'alice@example.com'
      },
      {
        id: 6,
        type: 'login',
        title: 'New Admin Login',
        message: 'Admin logged in from IP 192.168.1.100',
        createdAt: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        isRead: true,
        userEmail: 'admin@example.com'
      },
      {
        id: 7,
        type: 'system',
        title: 'Daily Deduction Complete',
        message: 'Daily deduction processed for 25 users, total ₹1,250',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        isRead: true
      },
      {
        id: 8,
        type: 'security',
        title: 'Failed Login Attempt',
        message: '5 failed login attempts from IP 203.0.113.1',
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        isRead: false
      },
      {
        id: 9,
        type: 'transaction',
        title: 'Low Balance Alert',
        message: 'User jane@example.com balance is below ₹100',
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        isRead: true,
        userEmail: 'jane@example.com'
      },
      {
        id: 10,
        type: 'email',
        title: 'Email Failed',
        message: 'Failed to send newsletter to 5 recipients due to invalid addresses',
        createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        isRead: true,
        relatedId: 987
      }
    ];
  }

  // Subscription Management
  async getAllSubscriptions(): Promise<Subscription[]> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<Subscription[]>(`${this.apiUrl}/superadmin/subscriptions`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      throw new Error('Failed to fetch subscriptions from database');
    }
  }

  async getSubscriptionStats(): Promise<SubscriptionStats> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<SubscriptionStats>(`${this.apiUrl}/superadmin/subscriptions/stats`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      throw new Error('Failed to fetch subscription stats from database');
    }
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<SubscriptionPlan[]>(`${this.apiUrl}/superadmin/subscriptions/plans`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw new Error('Failed to fetch subscription plans from database');
    }
  }

  async updateUserSubscription(subscriptionId: number, updates: {
    status?: string;
    autoRenew?: boolean;
    cancellationReason?: string;
  }): Promise<Subscription> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.put<Subscription>(`${this.apiUrl}/superadmin/subscriptions/${subscriptionId}`, updates, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  async getUserSubscriptionDetails(userId: number): Promise<UserSubscriptionDetails> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<UserSubscriptionDetails>(`${this.apiUrl}/superadmin/users/${userId}/subscriptions`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching user subscription details:', error);
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
  }): Promise<SubscriptionPlan> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.post<SubscriptionPlan>(`${this.apiUrl}/superadmin/subscriptions/plans`, planData, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error creating subscription plan:', error);
      throw error;
    }
  }

  async updateSubscriptionPlan(planId: number, updates: any): Promise<SubscriptionPlan> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.put<SubscriptionPlan>(`${this.apiUrl}/superadmin/subscriptions/plans/${planId}`, updates, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  async deleteSubscriptionPlan(planId: number): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/superadmin/subscriptions/plans/${planId}`, { headers })
      );
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      throw error;
    }
  }
} 