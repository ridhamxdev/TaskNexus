import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SuperadminService } from '../../services/superadmin.service';

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

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrls: ['./superadmin-dashboard.component.css']
})
export class SuperadminDashboardComponent implements OnInit {
  currentTime: string = '';
  activeTab: string = 'dashboard';
  
  // Dashboard Stats
  stats = {
    totalUsers: 0,
    totalTransactions: 0,
    totalEmails: 0,
    satisfactionRate: 0,
    monthlyGrowth: 0,
    newUsersThisMonth: 0
  };

  // Data arrays
  users: User[] = [];
  transactions: Transaction[] = [];
  emails: Email[] = [];
  cronJobs: CronJob[] = [];

  // Loading states
  isLoading = false;
  isUpdatingCron = false;

  // Filters and search
  userSearchTerm = '';
  transactionFilter = 'all';
  emailFilter = 'all';
  selectedUser: User | null = null;

  // Cron job form
  newCronJob: Partial<CronJob> = {
    name: '',
    schedule: '0 1 * * *',
    description: '',
    isActive: true
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;

  constructor(
    public auth: AuthService,
    private router: Router,
    private superadminService: SuperadminService
  ) {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  private updateTime(): void {
    this.currentTime = new Date().toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  async loadDashboardData() {
    this.isLoading = true;
    try {
      await Promise.all([
        this.loadUsers(),
        this.loadTransactions(),
        this.loadEmails(),
        this.loadCronJobs(),
        this.loadStats()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadUsers() {
    try {
      this.users = await this.superadminService.getAllUsers();
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async loadTransactions() {
    try {
      this.transactions = await this.superadminService.getAllTransactions();
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }

  async loadEmails() {
    try {
      this.emails = await this.superadminService.getAllEmails();
    } catch (error) {
      console.error('Error loading emails:', error);
    }
  }

  async loadCronJobs() {
    try {
      this.cronJobs = await this.superadminService.getCronJobs();
    } catch (error) {
      console.error('Error loading cron jobs:', error);
    }
  }

  async loadStats() {
    try {
      this.stats = await this.superadminService.getDashboardStats();
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'users' && this.users.length === 0) {
      this.loadUsers();
    } else if (tab === 'transactions' && this.transactions.length === 0) {
      this.loadTransactions();
    } else if (tab === 'emails' && this.emails.length === 0) {
      this.loadEmails();
    } else if (tab === 'cron' && this.cronJobs.length === 0) {
      this.loadCronJobs();
    }
  }

  // User management
  get filteredUsers() {
    return this.users.filter(user =>
      user.name.toLowerCase().includes(this.userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(this.userSearchTerm.toLowerCase())
    );
  }

  async toggleUserStatus(user: User) {
    try {
      user.status = user.status === 'Active' ? 'Inactive' : 'Active';
      await this.superadminService.updateUserStatus(user.id, user.status);
    } catch (error) {
      console.error('Error updating user status:', error);
      // Revert the change
      user.status = user.status === 'Active' ? 'Inactive' : 'Active';
    }
  }

  viewUserDetails(user: User) {
    this.selectedUser = user;
  }

  // Transaction management
  get filteredTransactions() {
    let filtered = this.transactions;
    if (this.transactionFilter !== 'all') {
      filtered = filtered.filter(t => t.type === this.transactionFilter);
    }
    return filtered;
  }

  // Email management
  get filteredEmails() {
    let filtered = this.emails;
    if (this.emailFilter !== 'all') {
      filtered = filtered.filter(e => e.status === this.emailFilter);
    }
    return filtered;
  }

  async resendEmail(email: Email) {
    try {
      await this.superadminService.resendEmail(email.id);
      email.status = 'Sent';
    } catch (error) {
      console.error('Error resending email:', error);
    }
  }

  // Cron job management
  async updateCronJob(cronJob: CronJob) {
    this.isUpdatingCron = true;
    try {
      await this.superadminService.updateCronJob(cronJob.name, cronJob);
      await this.loadCronJobs(); // Refresh the list
    } catch (error) {
      console.error('Error updating cron job:', error);
    } finally {
      this.isUpdatingCron = false;
    }
  }

  async addCronJob() {
    if (!this.newCronJob.name || !this.newCronJob.schedule) {
      return;
    }

    try {
      await this.superadminService.createCronJob(this.newCronJob as CronJob);
      this.newCronJob = {
        name: '',
        schedule: '0 1 * * *',
        description: '',
        isActive: true
      };
      await this.loadCronJobs();
    } catch (error) {
      console.error('Error creating cron job:', error);
    }
  }

  async deleteCronJob(cronJobName: string) {
    if (confirm('Are you sure you want to delete this cron job?')) {
      try {
        await this.superadminService.deleteCronJob(cronJobName);
        await this.loadCronJobs();
      } catch (error) {
        console.error('Error deleting cron job:', error);
      }
    }
  }

  async runCronJobNow(cronJobName: string) {
    try {
      await this.superadminService.runCronJobNow(cronJobName);
      await this.loadCronJobs(); // Refresh to show updated last run time
    } catch (error) {
      console.error('Error running cron job:', error);
    }
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTransactionColor(type: string): string {
    return type === 'CREDIT' ? 'text-green-400' : 'text-red-400';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Active':
      case 'Sent':
        return 'text-green-400';
      case 'Inactive':
      case 'Failed':
        return 'text-red-400';
      case 'Pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
} 