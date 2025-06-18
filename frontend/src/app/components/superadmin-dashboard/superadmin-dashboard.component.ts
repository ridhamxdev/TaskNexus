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

  // Loading states
  isLoading = false;
  isSavingSettings = false;

  // Filters and search
  userSearchTerm = '';
  transactionFilter = 'all';
  emailFilter = 'all';
  selectedUser: User | null = null;

  // Settings
  settings: Settings = {
    dailyDeductionAmount: 50,
    emailNotifications: {
      transactions: true,
      dailyDeductions: true
    }
  };

  // Notifications
  notifications: Notification[] = [];
  showNotifications = false;
  unreadNotificationsCount = 0;

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
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
    
    // Debug current user
    const currentUser = this.auth.getUser();
    console.log('Current logged in user:', currentUser);
    console.log('User role:', currentUser?.role);
    
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
        this.loadStats(),
        this.loadSettings(),
        this.loadNotifications()
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

  async loadStats() {
    try {
      this.stats = await this.superadminService.getDashboardStats();
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async loadSettings() {
    try {
      this.settings = await this.superadminService.getSettings();
    } catch (error) {
      console.error('Error loading settings:', error);
      // Keep default settings if loading fails
    }
  }

  async loadNotifications() {
    try {
      this.notifications = await this.superadminService.getAllNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
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
      email.status = 'SENT';
    } catch (error) {
      console.error('Error resending email:', error);
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
      case 'SENT': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Settings methods
  async saveSettings() {
    this.isSavingSettings = true;
    try {
      await this.superadminService.updateSettings(this.settings);
      this.settings.lastUpdated = new Date().toISOString();
      console.log('Settings saved successfully');
      
      // Show success feedback (you could add a toast notification here)
      setTimeout(() => {
        this.isSavingSettings = false;
      }, 1000);
    } catch (error) {
      console.error('Error saving settings:', error);
      this.isSavingSettings = false;
      // Show error feedback (you could add a toast notification here)
    }
  }

  // Notification methods
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.updateUnreadCount();
    }
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      notification.isRead = true;
      this.updateUnreadCount();
      // Optional: Call API to mark as read on server
      this.superadminService.markNotificationAsRead(notification.id).catch(console.error);
    }
  }

  markAllAsRead() {
    this.notifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
      }
    });
    this.updateUnreadCount();
    // Optional: Call API to mark all as read on server
    this.superadminService.markAllNotificationsAsRead().catch(console.error);
  }

  viewAllNotifications() {
    // Close dropdown and potentially navigate to a full notifications page
    this.closeNotifications();
    console.log('View all notifications clicked');
  }

  updateUnreadCount() {
    this.unreadNotificationsCount = this.notifications.filter(n => !n.isRead).length;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'transaction': return 'pi pi-credit-card';
      case 'login': return 'pi pi-sign-in';
      case 'security': return 'pi pi-shield';
      case 'system': return 'pi pi-cog';
      default: return 'pi pi-bell';
    }
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'transaction': return 'bg-green-600';
      case 'login': return 'bg-blue-600';
      case 'security': return 'bg-red-600';
      case 'system': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  }

  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
} 