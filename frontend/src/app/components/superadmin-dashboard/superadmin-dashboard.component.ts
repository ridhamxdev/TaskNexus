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

  // Subscription Stats
  subscriptionStats: SubscriptionStats = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    expiredSubscriptions: 0,
    expiringSoon: 0,
    subscriptionsThisMonth: 0,
    totalRevenue: 0
  };

  // Data arrays
  users: User[] = [];
  transactions: Transaction[] = [];
  emails: Email[] = [];
  subscriptions: Subscription[] = [];
  subscriptionPlans: SubscriptionPlan[] = [];

  // User subscription details for user-specific view
  selectedUserSubscriptionDetails: UserSubscriptionDetails | null = null;
  showUserSubscriptionModal = false;

  // Loading states
  isLoading = false;
  isSavingSettings = false;

  // Filters and search
  userSearchTerm = '';
  transactionFilter = 'all';
  emailFilter = 'all';
  subscriptionFilter = 'all';
  selectedUser: User | null = null;

  // Enhanced filtering for user-specific data
  transactionUserFilter = '';
  emailUserFilter = '';
  subscriptionUserFilter = '';
  transactionSearchTerm = '';
  emailSearchTerm = '';
  subscriptionSearchTerm = '';

  // Dropdown states for enhanced user filtering
  showTransactionUserDropdown = false;
  showEmailUserDropdown = false;
  showSubscriptionUserDropdown = false;
  selectedTransactionUser: {name: string, email: string} | null = null;
  selectedEmailUser: {name?: string, email: string} | null = null;
  selectedSubscriptionUser: {name: string, email: string} | null = null;

  // Pagination properties
  // Transactions pagination
  transactionCurrentPage = 1;
  transactionItemsPerPage = 10;
  transactionPageSizes = [5, 10, 25, 50, 100];

  // Emails pagination
  emailCurrentPage = 1;
  emailItemsPerPage = 10;
  emailPageSizes = [5, 10, 25, 50, 100];

  // Subscriptions pagination
  subscriptionCurrentPage = 1;
  subscriptionItemsPerPage = 10;
  subscriptionPageSizes = [5, 10, 25, 50, 100];

  // Sorting properties for transactions
  transactionSortField: string = '';
  transactionSortDirection: 'asc' | 'desc' = 'asc';

  // Sorting properties for emails
  emailSortField: string = '';
  emailSortDirection: 'asc' | 'desc' = 'asc';

  // Sorting properties for subscriptions
  subscriptionSortField: string = '';
  subscriptionSortDirection: 'asc' | 'desc' = 'asc';

  // Sorting properties for users
  userSortField: string = '';
  userSortDirection: 'asc' | 'desc' = 'asc';

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

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  async loadDashboardData() {
    this.isLoading = true;
    try {
      await Promise.all([
        this.loadUsers(),
        this.loadTransactions(),
        this.loadEmails(),
        this.loadSubscriptions(),
        this.loadSubscriptionPlans(),
        this.loadStats(),
        this.loadSubscriptionStats(),
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

  async loadSubscriptions() {
    try {
      this.subscriptions = await this.superadminService.getAllSubscriptions();
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  }

  async loadSubscriptionPlans() {
    try {
      this.subscriptionPlans = await this.superadminService.getAllSubscriptionPlans();
    } catch (error) {
      console.error('Error loading subscription plans:', error);
    }
  }

  async loadSubscriptionStats() {
    try {
      this.subscriptionStats = await this.superadminService.getSubscriptionStats();
    } catch (error) {
      console.error('Error loading subscription stats:', error);
    }
  }

  async viewUserSubscriptionDetails(userId: number) {
    try {
      this.selectedUserSubscriptionDetails = await this.superadminService.getUserSubscriptionDetails(userId);
      this.showUserSubscriptionModal = true;
    } catch (error) {
      console.error('Error loading user subscription details:', error);
    }
  }

  closeUserSubscriptionModal() {
    this.showUserSubscriptionModal = false;
    this.selectedUserSubscriptionDetails = null;
  }

  async updateSubscriptionStatus(subscriptionId: number, event: Event) {
    try {
      const target = event.target as HTMLSelectElement;
      const newStatus = target.value;
      await this.superadminService.updateUserSubscription(subscriptionId, { status: newStatus });
      await this.loadSubscriptions();
      await this.loadSubscriptionStats();
    } catch (error) {
      console.error('Error updating subscription status:', error);
    }
  }

  async toggleSubscriptionAutoRenew(subscriptionId: number, autoRenew: boolean) {
    try {
      await this.superadminService.updateUserSubscription(subscriptionId, { autoRenew });
      await this.loadSubscriptions();
    } catch (error) {
      console.error('Error updating subscription auto-renew:', error);
    }
  }

  get filteredSubscriptions() {
    let filtered = this.subscriptions;

    // Filter by status
    if (this.subscriptionFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === this.subscriptionFilter);
    }

    // Filter by user
    if (this.selectedSubscriptionUser) {
      filtered = filtered.filter(sub => sub.user.email === this.selectedSubscriptionUser!.email);
    }

    // Filter by search term
    if (this.subscriptionSearchTerm) {
      const searchTerm = this.subscriptionSearchTerm.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.user.name.toLowerCase().includes(searchTerm) ||
        sub.user.email.toLowerCase().includes(searchTerm) ||
        sub.plan.name.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  get paginatedSubscriptions() {
    const filtered = this.filteredSubscriptions;
    const startIndex = (this.subscriptionCurrentPage - 1) * this.subscriptionItemsPerPage;
    return filtered.slice(startIndex, startIndex + this.subscriptionItemsPerPage);
  }

  get subscriptionTotalPages() {
    return Math.ceil(this.filteredSubscriptions.length / this.subscriptionItemsPerPage);
  }

  get subscriptionPaginationInfo() {
    const filtered = this.filteredSubscriptions;
    const startIndex = (this.subscriptionCurrentPage - 1) * this.subscriptionItemsPerPage;
    const endIndex = Math.min(startIndex + this.subscriptionItemsPerPage, filtered.length);
    
    return `Showing ${startIndex + 1} to ${endIndex} of ${filtered.length} subscriptions`;
  }

  getSubscriptionStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'cancelled': return 'text-red-400';
      case 'expired': return 'text-gray-400';
      case 'pending': return 'text-yellow-400';
      case 'suspended': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  }

  getSubscriptionStatusBadgeColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'expired': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'suspended': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  // Clear subscription filters
  clearSubscriptionFilters() {
    this.subscriptionFilter = 'all';
    this.subscriptionSearchTerm = '';
    this.selectedSubscriptionUser = null;
    this.subscriptionUserFilter = '';
    this.subscriptionCurrentPage = 1;
  }

  // Subscription user dropdown methods
  toggleSubscriptionUserDropdown() {
    this.showSubscriptionUserDropdown = !this.showSubscriptionUserDropdown;
    this.closeAllDropdowns();
  }

  selectSubscriptionUser(user: {name: string, email: string}) {
    this.selectedSubscriptionUser = user;
    this.showSubscriptionUserDropdown = false;
  }

  removeSubscriptionUserFilter() {
    this.selectedSubscriptionUser = null;
  }

  get subscriptionUsers() {
    const users: {name: string, email: string}[] = [];
    const seenEmails = new Set<string>();
    
    this.subscriptions.forEach(sub => {
      if (!seenEmails.has(sub.user.email)) {
        users.push({
          name: sub.user.name,
          email: sub.user.email
        });
        seenEmails.add(sub.user.email);
      }
    });
    
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Subscription pagination methods
  goToSubscriptionPage(page: number) {
    if (page >= 1 && page <= this.subscriptionTotalPages) {
      this.subscriptionCurrentPage = page;
    }
  }

  nextSubscriptionPage() {
    if (this.subscriptionCurrentPage < this.subscriptionTotalPages) {
      this.subscriptionCurrentPage++;
    }
  }

  previousSubscriptionPage() {
    if (this.subscriptionCurrentPage > 1) {
      this.subscriptionCurrentPage--;
    }
  }

  changeSubscriptionPageSize(newSize: number) {
    this.subscriptionItemsPerPage = newSize;
    this.subscriptionCurrentPage = 1;
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
      this.updateUnreadCount();
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
    
    // Filter by transaction type (existing functionality)
    if (this.transactionFilter !== 'all') {
      filtered = filtered.filter(t => t.type === this.transactionFilter);
    }
    
    // Filter by user (new functionality)
    if (this.transactionUserFilter) {
      filtered = filtered.filter(t => 
        t.user.name.toLowerCase().includes(this.transactionUserFilter.toLowerCase()) ||
        t.user.email.toLowerCase().includes(this.transactionUserFilter.toLowerCase())
      );
    }
    
    // General search across transaction data (new functionality)
    if (this.transactionSearchTerm) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(this.transactionSearchTerm.toLowerCase()) ||
        t.user.name.toLowerCase().includes(this.transactionSearchTerm.toLowerCase()) ||
        t.user.email.toLowerCase().includes(this.transactionSearchTerm.toLowerCase()) ||
        t.amount.toString().includes(this.transactionSearchTerm) ||
        t.id.toString().includes(this.transactionSearchTerm)
      );
    }
    
    return filtered;
  }

  // Get paginated transactions
  get paginatedTransactions() {
    const sorted = this.sortedTransactions;
    const startIndex = (this.transactionCurrentPage - 1) * this.transactionItemsPerPage;
    const endIndex = startIndex + this.transactionItemsPerPage;
    return sorted.slice(startIndex, endIndex);
  }

  // Transaction pagination helpers
  get transactionTotalPages() {
    return Math.ceil(this.sortedTransactions.length / this.transactionItemsPerPage);
  }

  get transactionPaginationInfo() {
    const total = this.sortedTransactions.length;
    const start = Math.min(((this.transactionCurrentPage - 1) * this.transactionItemsPerPage) + 1, total);
    const end = Math.min(this.transactionCurrentPage * this.transactionItemsPerPage, total);
    return { start, end, total };
  }

  // Email management
  get filteredEmails() {
    let filtered = this.emails;
    
    // Filter by email status (existing functionality)
    if (this.emailFilter !== 'all') {
      filtered = filtered.filter(e => e.status === this.emailFilter);
    }
    
    // Filter by user (new functionality)
    if (this.emailUserFilter) {
      filtered = filtered.filter(e => 
        e.to.toLowerCase().includes(this.emailUserFilter.toLowerCase()) ||
        (e.sender?.name && e.sender.name.toLowerCase().includes(this.emailUserFilter.toLowerCase())) ||
        (e.sender?.email && e.sender.email.toLowerCase().includes(this.emailUserFilter.toLowerCase()))
      );
    }
    
    // General search across email data (new functionality)
    if (this.emailSearchTerm) {
      filtered = filtered.filter(e =>
        e.subject.toLowerCase().includes(this.emailSearchTerm.toLowerCase()) ||
        e.to.toLowerCase().includes(this.emailSearchTerm.toLowerCase()) ||
        e.body.toLowerCase().includes(this.emailSearchTerm.toLowerCase()) ||
        e.id.toString().includes(this.emailSearchTerm) ||
        (e.sender?.name && e.sender.name.toLowerCase().includes(this.emailSearchTerm.toLowerCase())) ||
        (e.sender?.email && e.sender.email.toLowerCase().includes(this.emailSearchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  }

  // Get paginated emails
  get paginatedEmails() {
    const sorted = this.sortedEmails;
    const startIndex = (this.emailCurrentPage - 1) * this.emailItemsPerPage;
    const endIndex = startIndex + this.emailItemsPerPage;
    return sorted.slice(startIndex, endIndex);
  }

  // Email pagination helpers
  get emailTotalPages() {
    return Math.ceil(this.sortedEmails.length / this.emailItemsPerPage);
  }

  get emailPaginationInfo() {
    const total = this.sortedEmails.length;
    const start = Math.min(((this.emailCurrentPage - 1) * this.emailItemsPerPage) + 1, total);
    const end = Math.min(this.emailCurrentPage * this.emailItemsPerPage, total);
    return { start, end, total };
  }

  // Helper methods for filtering
  clearTransactionFilters() {
    this.transactionFilter = 'all';
    this.transactionUserFilter = '';
    this.transactionSearchTerm = '';
    this.selectedTransactionUser = null;
    this.showTransactionUserDropdown = false;
    this.transactionCurrentPage = 1; // Reset pagination
    this.transactionSortField = ''; // Reset sorting
    this.transactionSortDirection = 'asc';
  }

  clearEmailFilters() {
    this.emailFilter = 'all';
    this.emailUserFilter = '';
    this.emailSearchTerm = '';
    this.selectedEmailUser = null;
    this.showEmailUserDropdown = false;
    this.emailCurrentPage = 1; // Reset pagination
    this.emailSortField = ''; // Reset sorting
    this.emailSortDirection = 'asc';
  }

  // Enhanced user dropdown methods
  toggleTransactionUserDropdown() {
    this.showTransactionUserDropdown = !this.showTransactionUserDropdown;
    this.showEmailUserDropdown = false; // Close other dropdown
  }

  toggleEmailUserDropdown() {
    this.showEmailUserDropdown = !this.showEmailUserDropdown;
    this.showTransactionUserDropdown = false; // Close other dropdown
  }

  selectTransactionUser(user: {name: string, email: string}) {
    this.selectedTransactionUser = user;
    this.transactionUserFilter = user.email;
    this.showTransactionUserDropdown = false;
  }

  selectEmailUser(user: {name?: string, email: string}) {
    this.selectedEmailUser = user;
    this.emailUserFilter = user.email;
    this.showEmailUserDropdown = false;
  }

  removeTransactionUserFilter() {
    this.selectedTransactionUser = null;
    this.transactionUserFilter = '';
  }

  removeEmailUserFilter() {
    this.selectedEmailUser = null;
    this.emailUserFilter = '';
  }

  // Close dropdowns when clicking outside
  closeAllDropdowns() {
    this.showTransactionUserDropdown = false;
    this.showEmailUserDropdown = false;
    this.showSubscriptionUserDropdown = false;
  }

  // Get unique users from transactions for dropdown
  get transactionUsers() {
    const users = this.transactions.map(t => ({
      name: t.user.name,
      email: t.user.email
    }));
    
    // Remove duplicates based on email
    const uniqueUsers = users.filter((user, index, self) =>
      index === self.findIndex(u => u.email === user.email)
    );
    
    return uniqueUsers.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get unique users from emails for dropdown
  get emailUsers() {
    const users: Array<{name?: string, email: string}> = [];
    
    // Add recipients
    this.emails.forEach(e => {
      users.push({ email: e.to });
    });
    
    // Add senders
    this.emails.forEach(e => {
      if (e.sender) {
        users.push({ name: e.sender.name, email: e.sender.email });
      }
    });
    
    // Remove duplicates based on email
    const uniqueUsers = users.filter((user, index, self) =>
      index === self.findIndex(u => u.email === user.email)
    );
    
    return uniqueUsers.sort((a, b) => 
      (a.name || a.email).localeCompare(b.name || b.email)
    );
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

  // Helper methods for tracking and counting
  trackByEmail(index: number, user: {email: string}): string {
    return user.email;
  }

  getTransactionCountForUser(email: string): string {
    const count = this.transactions.filter(t => t.user.email === email).length;
    return count === 1 ? '1 transaction' : `${count} transactions`;
  }

  getEmailCountForUser(email: string): string {
    const count = this.emails.filter(e => 
      e.to === email || (e.sender && e.sender.email === email)
    ).length;
    return count === 1 ? '1 email' : `${count} emails`;
  }

  // Pagination control methods
  // Transaction pagination
  goToTransactionPage(page: number) {
    if (page >= 1 && page <= this.transactionTotalPages) {
      this.transactionCurrentPage = page;
    }
  }

  nextTransactionPage() {
    if (this.transactionCurrentPage < this.transactionTotalPages) {
      this.transactionCurrentPage++;
    }
  }

  previousTransactionPage() {
    if (this.transactionCurrentPage > 1) {
      this.transactionCurrentPage--;
    }
  }

  changeTransactionPageSize(newSize: number) {
    this.transactionItemsPerPage = newSize;
    this.transactionCurrentPage = 1; // Reset to first page
  }

  get transactionPageNumbers() {
    const totalPages = this.transactionTotalPages;
    const currentPage = this.transactionCurrentPage;
    const delta = 2; // Number of pages to show on each side of current page
    
    const pages: number[] = [];
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  get transactionShowFirstPage() {
    return this.transactionPageNumbers.length > 0 && this.transactionPageNumbers[0] > 1;
  }

  get transactionShowLastPage() {
    return this.transactionPageNumbers.length > 0 && this.transactionPageNumbers[this.transactionPageNumbers.length - 1] < this.transactionTotalPages;
  }

  get transactionShowFirstEllipsis() {
    return this.transactionPageNumbers.length > 0 && this.transactionPageNumbers[0] > 2;
  }

  get transactionShowLastEllipsis() {
    return this.transactionPageNumbers.length > 0 && this.transactionPageNumbers[this.transactionPageNumbers.length - 1] < this.transactionTotalPages - 1;
  }

  // Email pagination
  goToEmailPage(page: number) {
    if (page >= 1 && page <= this.emailTotalPages) {
      this.emailCurrentPage = page;
    }
  }

  nextEmailPage() {
    if (this.emailCurrentPage < this.emailTotalPages) {
      this.emailCurrentPage++;
    }
  }

  previousEmailPage() {
    if (this.emailCurrentPage > 1) {
      this.emailCurrentPage--;
    }
  }

  changeEmailPageSize(newSize: number) {
    this.emailItemsPerPage = newSize;
    this.emailCurrentPage = 1; // Reset to first page
  }

  get emailPageNumbers() {
    const total = this.emailTotalPages;
    const current = this.emailCurrentPage;
    const delta = 2;
    const pages: number[] = [];
    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  get emailShowFirstPage() {
    return this.emailPageNumbers.length > 0 && this.emailPageNumbers[0] > 1;
  }

  get emailShowLastPage() {
    return this.emailPageNumbers.length > 0 && this.emailPageNumbers[this.emailPageNumbers.length - 1] < this.emailTotalPages;
  }

  get emailShowFirstEllipsis() {
    return this.emailPageNumbers.length > 0 && this.emailPageNumbers[0] > 2;
  }

  get emailShowLastEllipsis() {
    return this.emailPageNumbers.length > 0 && this.emailPageNumbers[this.emailPageNumbers.length - 1] < this.emailTotalPages - 1;
  }

  // Sorting methods for transactions
  sortTransactions(field: string) {
    if (this.transactionSortField === field) {
      this.transactionSortDirection = this.transactionSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.transactionSortField = field;
      this.transactionSortDirection = 'asc';
    }
    // Reset to first page when sorting
    this.transactionCurrentPage = 1;
  }

  getTransactionSortIcon(field: string): string {
    if (this.transactionSortField !== field) {
      return 'pi-sort';
    }
    return this.transactionSortDirection === 'asc' ? 'pi-sort-up' : 'pi-sort-down';
  }

  get sortedTransactions() {
    if (!this.transactionSortField) {
      return this.filteredTransactions;
    }

    return [...this.filteredTransactions].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.transactionSortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'user':
          valueA = a.user.name.toLowerCase();
          valueB = b.user.name.toLowerCase();
          break;
        case 'email':
          valueA = a.user.email.toLowerCase();
          valueB = b.user.email.toLowerCase();
          break;
        case 'type':
          valueA = a.type;
          valueB = b.type;
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'description':
          valueA = a.description.toLowerCase();
          valueB = b.description.toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.transactionDate);
          valueB = new Date(b.transactionDate);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return this.transactionSortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.transactionSortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Sorting methods for emails
  sortEmails(field: string) {
    if (this.emailSortField === field) {
      this.emailSortDirection = this.emailSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.emailSortField = field;
      this.emailSortDirection = 'asc';
    }
    // Reset to first page when sorting
    this.emailCurrentPage = 1;
  }

  getEmailSortIcon(field: string): string {
    if (this.emailSortField !== field) {
      return 'pi-sort';
    }
    return this.emailSortDirection === 'asc' ? 'pi-sort-up' : 'pi-sort-down';
  }

  get sortedEmails() {
    if (!this.emailSortField) {
      return this.filteredEmails;
    }

    return [...this.filteredEmails].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.emailSortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'to':
          valueA = a.to.toLowerCase();
          valueB = b.to.toLowerCase();
          break;
        case 'from':
          valueA = (a.sender?.email || '').toLowerCase();
          valueB = (b.sender?.email || '').toLowerCase();
          break;
        case 'subject':
          valueA = a.subject.toLowerCase();
          valueB = b.subject.toLowerCase();
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'date':
          valueA = new Date(a.sentAt);
          valueB = new Date(b.sentAt);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return this.emailSortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.emailSortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Sorting methods for users
  sortUsers(field: string) {
    if (this.userSortField === field) {
      this.userSortDirection = this.userSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.userSortField = field;
      this.userSortDirection = 'asc';
    }
  }

  getUserSortIcon(field: string): string {
    if (this.userSortField !== field) {
      return 'pi-sort';
    }
    return this.userSortDirection === 'asc' ? 'pi-sort-up' : 'pi-sort-down';
  }

  get sortedUsers() {
    if (!this.userSortField) {
      return this.filteredUsers;
    }

    return [...this.filteredUsers].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.userSortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'email':
          valueA = a.email.toLowerCase();
          valueB = b.email.toLowerCase();
          break;
        case 'role':
          valueA = a.role.toLowerCase();
          valueB = b.role.toLowerCase();
          break;
        case 'phone':
          valueA = a.phone;
          valueB = b.phone;
          break;
        case 'balance':
          valueA = a.balance;
          valueB = b.balance;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'createdAt':
          valueA = new Date(a.createdAt);
          valueB = new Date(b.createdAt);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return this.userSortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.userSortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
} 