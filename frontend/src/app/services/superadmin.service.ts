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
  type: 'transaction' | 'login' | 'system' | 'security';
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
      
      // Try to return partial real data if possible, otherwise minimal mock data
      console.warn('Falling back to mock dashboard stats due to API error');
      return {
        totalUsers: 0,
        totalTransactions: 0,
        totalEmails: 0,
        satisfactionRate: 0,
        monthlyGrowth: 0,
        newUsersThisMonth: 0
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
      // Return mock data for now
      return [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          balance: 5000,
          role: 'user',
          createdAt: new Date().toISOString(),
          status: 'Active'
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1234567891',
          balance: 3500,
          role: 'user',
          createdAt: new Date().toISOString(),
          status: 'Active'
        }
      ];
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
      // Return mock data for now
      return [
        {
          id: 1,
          userId: 1,
          amount: 1000,
          type: 'CREDIT',
          description: 'Money added to account',
          transactionDate: new Date().toISOString(),
          user: {
            name: 'John Doe',
            email: 'john@example.com'
          }
        },
        {
          id: 2,
          userId: 2,
          amount: 50,
          type: 'DEBIT',
          description: 'Daily deduction',
          transactionDate: new Date().toISOString(),
          user: {
            name: 'Jane Smith',
            email: 'jane@example.com'
          }
        }
      ];
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
      // Return mock data for now
      return [
        {
          id: 1,
          to: 'john@example.com',
          subject: 'Transaction Confirmation',
          body: 'Your transaction has been processed.',
          sentAt: new Date().toISOString(),
          status: 'SENT'
        },
        {
          id: 2,
          to: 'jane@example.com',
          subject: 'Daily Deduction Notice',
          body: 'Daily deduction has been processed.',
          sentAt: new Date().toISOString(),
          status: 'FAILED'
        }
      ];
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

  private getMockNotifications(): Notification[] {
    const now = new Date();
    return [
      {
        id: 1,
        type: 'transaction',
        title: 'Large Transaction Alert',
        message: 'User john@example.com made a ₹5,000 transaction',
        createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        isRead: false,
        relatedId: 123,
        userEmail: 'john@example.com'
      },
      {
        id: 2,
        type: 'login',
        title: 'New Admin Login',
        message: 'Admin logged in from IP 192.168.1.100',
        createdAt: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        isRead: false,
        userEmail: 'admin@example.com'
      },
      {
        id: 3,
        type: 'system',
        title: 'Daily Deduction Complete',
        message: 'Daily deduction processed for 25 users, total ₹1,250',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        isRead: true
      },
      {
        id: 4,
        type: 'security',
        title: 'Failed Login Attempt',
        message: '5 failed login attempts from IP 203.0.113.1',
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        isRead: false
      },
      {
        id: 5,
        type: 'transaction',
        title: 'Low Balance Alert',
        message: 'User jane@example.com balance is below ₹100',
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        isRead: true,
        userEmail: 'jane@example.com'
      }
    ];
  }
} 