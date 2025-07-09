import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { API_CONFIG, buildApiUrl } from '../config/api.config';

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

interface UserDetails extends User {
  subscriptions: Subscription[];
  transactions: Transaction[];
  emails: Email[];
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalEmails: number;
  totalTransactions: number;
  totalRevenue: number;
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
  private apiUrl = API_CONFIG.BASE_URL;

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
      const response = await firstValueFrom(
        this.http.get<DashboardStats>(`${this.apiUrl}/superadmin/stats`, { headers })
      );
      return {
        totalUsers: response?.totalUsers || 0,
        activeUsers: response?.activeUsers || 0,
        totalSubscriptions: response?.totalSubscriptions || 0,
        activeSubscriptions: response?.activeSubscriptions || 0,
        totalEmails: response?.totalEmails || 0,
        totalTransactions: response?.totalTransactions || 0,
        totalRevenue: response?.totalRevenue || 0
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalEmails: 0,
        totalTransactions: 0,
        totalRevenue: 0
      };
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

  getUserById(userId: string): Observable<UserDetails> {
    const headers = this.getHeaders();
    return this.http.get<UserDetails>(`${this.apiUrl}/superadmin/users/${userId}`, { headers });
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
      console.log('Fetching transactions from API...');
      const headers = this.getHeaders();
      
      const response = await firstValueFrom(
        this.http.get<Transaction[]>(`${this.apiUrl}/superadmin/transactions`, { headers })
      );
      
      // Log the raw response
      console.log('Raw API Response:', {
        fullResponse: response,
        sampleTransaction: response?.[0],
        responseType: typeof response,
        isArray: Array.isArray(response)
      });

      // Ensure all transactions have valid amounts and proper type conversion
      const validatedTransactions = (response || []).map(tx => {
        const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : 
                      typeof tx.amount === 'number' ? tx.amount : 0;
                      
        console.log('Processing transaction:', {
          id: tx.id,
          originalAmount: tx.amount,
          parsedAmount: amount,
          type: tx.type
        });
        
        return {
          ...tx,
          amount: amount
        };
      });

      console.log('Validated transactions:', validatedTransactions);
      return validatedTransactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      console.error('Full error details:', {
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        message: (error as any)?.message,
        url: `${this.apiUrl}/superadmin/transactions`
      });
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

  // Impersonation methods
  async startImpersonation(targetUser: any): Promise<any> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.post(`${this.apiUrl}/superadmin/impersonate`, {
          targetUserId: targetUser.id
        }, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error starting impersonation:', error);
      throw error;
    }
  }

  async stopImpersonation(): Promise<any> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.post(`${this.apiUrl}/superadmin/stop-impersonation`, {}, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error stopping impersonation:', error);
      throw error;
    }
  }

  // Fee Configuration
  getFeeConfigurations(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/superadmin/users/${userId}/fees`, { headers: this.getHeaders() });
  }

  getAddMoneyFeeConfigurations(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/superadmin/users/${userId}/fees/add-money`, { headers: this.getHeaders() });
  }

  getSubscriptionFeeConfigurations(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/superadmin/users/${userId}/fees/subscription`, { headers: this.getHeaders() });
  }

  getAvailableSubscriptionPlansForFeeConfig(userId: string): Observable<any[]> {
    const headers = this.getHeaders();
    return this.http.get<any[]>(
      `${this.apiUrl}/superadmin/users/${userId}/subscription-plans/available`, 
      { headers }
    );
  }

  addFeeConfiguration(userId: string, feeConfig: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(
      `${this.apiUrl}/superadmin/users/${userId}/fees`, 
      feeConfig,
      { headers }
    );
  }

  updateFeeConfiguration(feeId: number, feeConfig: any): Observable<any> {
    const headers = this.getHeaders();
    return this.http.put<any>(
      `${this.apiUrl}/superadmin/fees/${feeId}`, 
      feeConfig,
      { headers }
    );
  }

  deleteFeeConfiguration(feeId: number): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete<any>(`${this.apiUrl}/superadmin/fees/${feeId}`, { headers });
  }

  bulkUpdateFeeConfigurations(userId: string, configurations: any[]): Observable<any> {
    const headers = this.getHeaders();
    
    // Determine the fee type from configurations
    let endpoint = `${this.apiUrl}/superadmin/users/${userId}/fees/bulk`;
    
    if (configurations.length > 0) {
      const feeType = configurations[0].type;
      if (feeType === 'add_money') {
        endpoint = `${this.apiUrl}/superadmin/users/${userId}/fees/add-money/bulk`;
      } else if (feeType === 'send_money') {
        endpoint = `${this.apiUrl}/superadmin/users/${userId}/fees/send-money/bulk`;
      }
    }
    
    return this.http.put(endpoint, { feeConfigurations: configurations }, { headers });
  }

  bulkUpdateAddMoneyFeeConfigurations(userId: string, configurations: any[]): Observable<any> {
    const headers = this.getHeaders();
    return this.http.put(`${this.apiUrl}/superadmin/users/${userId}/fees/add-money/bulk`, { feeConfigurations: configurations }, { headers });
  }

  bulkUpdateSendMoneyFeeConfigurations(userId: string, configurations: any[]): Observable<any> {
    const headers = this.getHeaders();
    return this.http.put(`${this.apiUrl}/superadmin/users/${userId}/fees/send-money/bulk`, { feeConfigurations: configurations }, { headers });
  }

  // Default Fee Configuration Management
  async getDefaultFeeConfiguration(): Promise<any> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get(`${this.apiUrl}/superadmin/default-fee`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching default fee configuration:', error);
      throw error;
    }
  }

  async createDefaultFeeConfiguration(feeData: any): Promise<any> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.post(`${this.apiUrl}/superadmin/default-fee`, feeData, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error creating default fee configuration:', error);
      throw error;
    }
  }

  async updateDefaultFeeConfiguration(configId: number, feeData: any): Promise<any> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.put(`${this.apiUrl}/superadmin/default-fee/${configId}`, feeData, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error updating default fee configuration:', error);
      throw error;
    }
  }

  async toggleUserDefaultFee(userId: number, data: { defaultFeeEnabled: boolean }): Promise<any> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.put(`${this.apiUrl}/superadmin/users/${userId}/default-fee-toggle`, data, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error toggling user default fee:', error);
      throw error;
    }
  }

  async getUserDefaultFeeStatus(userId: number): Promise<{ defaultFeeEnabled: boolean }> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<{ defaultFeeEnabled: boolean }>(`${this.apiUrl}/superadmin/users/${userId}/default-fee-status`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching user default fee status:', error);
      throw error;
    }
  }

  // Fee Versioning Methods
  async getAllFeeVersionsForUser(userId: number): Promise<any[]> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/superadmin/users/${userId}/fee-versions`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching fee versions:', error);
      throw error;
    }
  }

  async getFeeVersionHistory(userId: number, feeType: string): Promise<any[]> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/superadmin/users/${userId}/fee-versions/${feeType}`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching fee version history:', error);
      throw error;
    }
  }

  async getCurrentFeeVersion(userId: number, feeType: string): Promise<any> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/superadmin/users/${userId}/current-fee-version/${feeType}`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching current fee version:', error);
      throw error;
    }
  }
} 