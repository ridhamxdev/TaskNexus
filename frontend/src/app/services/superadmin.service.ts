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
  sentAt: string;
  status: 'Sent' | 'Failed' | 'Pending';
}

interface CronJob {
  name: string;
  schedule: string;
  description: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface DashboardStats {
  totalUsers: number;
  totalTransactions: number;
  totalEmails: number;
  satisfactionRate: number;
  monthlyGrowth: number;
  newUsersThisMonth: number;
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
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<DashboardStats>(`${this.apiUrl}/superadmin/stats`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return mock data for now
      return {
        totalUsers: 12600,
        totalTransactions: 1186,
        totalEmails: 22,
        satisfactionRate: 89.9,
        monthlyGrowth: 12,
        newUsersThisMonth: 22
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
          status: 'Sent'
        },
        {
          id: 2,
          to: 'jane@example.com',
          subject: 'Daily Deduction Notice',
          body: 'Daily deduction has been processed.',
          sentAt: new Date().toISOString(),
          status: 'Failed'
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

  // Cron Job Management
  async getCronJobs(): Promise<CronJob[]> {
    try {
      const headers = this.getHeaders();
      const response = await firstValueFrom(
        this.http.get<CronJob[]>(`${this.apiUrl}/superadmin/cron-jobs`, { headers })
      );
      return response;
    } catch (error) {
      console.error('Error fetching cron jobs:', error);
      // Return mock data for now
      return [
        {
          name: 'daily-deduction',
          schedule: '0 1 * * *',
          description: 'Daily deduction from user accounts',
          isActive: true,
          lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          name: 'weekly-report',
          schedule: '0 9 * * 1',
          description: 'Weekly report generation',
          isActive: false,
          lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }
  }

  async createCronJob(cronJob: CronJob): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/superadmin/cron-jobs`, cronJob, { headers })
      );
    } catch (error) {
      console.error('Error creating cron job:', error);
      throw error;
    }
  }

  async updateCronJob(cronJobName: string, cronJob: CronJob): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.put(`${this.apiUrl}/superadmin/cron-jobs/${cronJobName}`, cronJob, { headers })
      );
    } catch (error) {
      console.error('Error updating cron job:', error);
      throw error;
    }
  }

  async deleteCronJob(cronJobName: string): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/superadmin/cron-jobs/${cronJobName}`, { headers })
      );
    } catch (error) {
      console.error('Error deleting cron job:', error);
      throw error;
    }
  }

  async runCronJobNow(cronJobName: string): Promise<void> {
    try {
      const headers = this.getHeaders();
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/superadmin/cron-jobs/${cronJobName}/run`, {}, { headers })
      );
    } catch (error) {
      console.error('Error running cron job:', error);
      throw error;
    }
  }
} 