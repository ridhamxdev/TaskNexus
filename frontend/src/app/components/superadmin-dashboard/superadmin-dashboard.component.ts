import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService } from '../../services/auth.service';
import { SuperadminService } from '../../services/superadmin.service';
import { TwoFactorSettingsComponent } from '../two-factor-settings/two-factor-settings.component';

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
  type: 'transaction' | 'subscription' | 'email' | 'user' | 'login' | 'system' | 'security';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  relatedId?: number;
  userEmail?: string;
}

interface PlanForm {
  name: string;
  description: string;
  price: number;
  billingCycle: string;
  status: string;
  sortOrder: number;
  emailLimit: number;
  transactionLimit: number;
  features: {
    emailSupport: boolean;
    prioritySupport: boolean;
    analyticsReports: boolean;
    customBranding: boolean;
    apiAccess: boolean;
  };
}

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TwoFactorSettingsComponent
  ],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrls: ['./superadmin-dashboard.component.css'],
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)', height: 0 }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)', height: '*' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)', height: 0 }))
      ])
    ])
  ]
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
  
  // Error handling properties
  error: string | null = null;
  dataLoadError: string | null = null;
  usersError: string | null = null;
  transactionsError: string | null = null;
  emailsError: string | null = null;
  subscriptionsError: string | null = null;

  // Filters and search
  userSearchTerm = '';
  transactionFilter = 'all';
  emailFilter = 'all';
  subscriptionFilter = 'all';

  // Enhanced filtering for user-specific data
  transactionUserFilter = '';
  emailUserFilter = '';
  subscriptionUserFilter = '';
  transactionSearchTerm = '';
  emailSearchTerm = '';
  subscriptionSearchTerm = '';

  // Enhanced filter properties for transactions
  transactionDateFromFilter = '';
  transactionDateToFilter = '';
  transactionAmountMinFilter: number | null = null;
  transactionAmountMaxFilter: number | null = null;
  
  // Enhanced filter properties for emails
  emailDateFromFilter = '';
  emailDateToFilter = '';
  emailRecipientFilter = '';
  emailSubjectFilter = '';
  
  // Enhanced filter properties for subscriptions
  subscriptionDateFromFilter = '';
  subscriptionDateToFilter = '';
  subscriptionPlanFilter = 'all';
  
  // Enhanced filter properties for users
  userRoleFilter = 'all';
  userStatusFilter = 'all';
  userDateFromFilter = '';
  userDateToFilter = '';
  userBalanceMinFilter: number | null = null;
  userBalanceMaxFilter: number | null = null;

  // Filter panel states
  showTransactionFilters = false;
  showEmailFilters = false;
  showUserFilters = false;
  showSubscriptionFilters = false;

  // Active filter tracking
  hasActiveTransactionFilters = false;
  hasActiveEmailFilters = false;
  hasActiveUserFilters = false;
  hasActiveSubscriptionFilters = false;

  // Dropdown states for enhanced user filtering
  showTransactionUserDropdown = false;
  showEmailUserDropdown = false;
  showSubscriptionUserDropdown = false;
  selectedTransactionUser: {name: string, email: string} | null = null;
  selectedEmailUser: {name?: string, email: string} | null = null;
  selectedSubscriptionUser: {name: string, email: string} | null = null;
  selectedSubscriptionPlan: SubscriptionPlan | null = null;
  showSubscriptionPlanDropdown = false;
  subscriptionStatusFilter = '';

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

  // Plans management properties
  showPlanModal = false;
  editingPlan: SubscriptionPlan | null = null;
  isSavingPlan = false;

  // Role Management
  showRoleManagement = false;
  roleSearchTerm = '';
  roleFilterType = '';
  isUpdatingRole = false;
  planForm: PlanForm = {
    name: '',
    description: '',
    price: 0,
    billingCycle: 'monthly',
    status: 'active',
    sortOrder: 1,
    emailLimit: 0,
    transactionLimit: 0,
    features: {
      emailSupport: false,
      prioritySupport: false,
      analyticsReports: false,
      customBranding: false,
      apiAccess: false
    }
  };

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
    
    // Initialize filter states
    this.updateActiveTransactionFilters();
    this.updateActiveEmailFilters();
    this.updateActiveUserFilters();
    this.updateActiveSubscriptionFilters();
    
    this.loadDashboardData();
    
    // Set up real-time notifications polling
    this.setupNotificationPolling();
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
    this.dataLoadError = null;
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
      this.dataLoadError = 'Failed to load dashboard data. Please check your database connection.';
    } finally {
      this.isLoading = false;
    }
  }

  async loadUsers() {
    try {
      this.usersError = null;
      this.users = await this.superadminService.getAllUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      this.usersError = 'Failed to load users from database. Please ensure the backend server is running and the database is connected.';
      this.users = [];
    }
  }

  async loadTransactions() {
    try {
      this.transactionsError = null;
      this.transactions = await this.superadminService.getAllTransactions();
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.transactionsError = 'Failed to load transactions from database. Please ensure the backend server is running and the database is connected.';
      this.transactions = [];
    }
  }

  async loadEmails() {
    try {
      this.emailsError = null;
      this.emails = await this.superadminService.getAllEmails();
    } catch (error) {
      console.error('Error loading emails:', error);
      this.emailsError = 'Failed to load emails from database. Please ensure the backend server is running and the database is connected.';
      this.emails = [];
    }
  }

  async loadSubscriptions() {
    try {
      this.subscriptionsError = null;
      this.subscriptions = await this.superadminService.getAllSubscriptions();
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      this.subscriptionsError = 'Failed to load subscriptions from database. Please ensure the backend server is running and the database is connected.';
      this.subscriptions = [];
    }
  }

  async loadSubscriptionPlans() {
    try {
      this.subscriptionPlans = await this.superadminService.getAllSubscriptionPlans();
    } catch (error) {
      console.error('Error loading subscription plans:', error);
      this.subscriptionPlans = [];
    }
  }

  async loadSubscriptionStats() {
    try {
      this.subscriptionStats = await this.superadminService.getSubscriptionStats();
    } catch (error) {
      console.error('Error loading subscription stats:', error);
      // Keep default empty stats if loading fails
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
    let filtered = [...this.subscriptions];

    // Filter by status (using the old filter for backward compatibility)
    if (this.subscriptionFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === this.subscriptionFilter);
    }

    // Filter by status (using the new dropdown filter)
    if (this.subscriptionStatusFilter && this.subscriptionStatusFilter !== '') {
      filtered = filtered.filter(sub => sub.status === this.subscriptionStatusFilter);
    }

    // Filter by plan (support both plan ID and plan name)
    if (this.subscriptionPlanFilter !== 'all') {
      filtered = filtered.filter(sub => {
        return sub.plan.name.toLowerCase() === this.subscriptionPlanFilter.toLowerCase() ||
               sub.planId.toString() === this.subscriptionPlanFilter;
      });
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
        sub.plan.name.toLowerCase().includes(searchTerm) ||
        sub.id.toString().includes(searchTerm)
      );
    }

    // Date range filter - start date
    if (this.subscriptionDateFromFilter) {
      const fromDate = new Date(this.subscriptionDateFromFilter);
      filtered = filtered.filter(sub => new Date(sub.startDate) >= fromDate);
    }

    if (this.subscriptionDateToFilter) {
      const toDate = new Date(this.subscriptionDateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(sub => new Date(sub.startDate) <= toDate);
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

  selectSubscriptionUser(user: {name: string, email: string} | null) {
    this.selectedSubscriptionUser = user;
    this.subscriptionUserFilter = user ? user.email : '';
    this.showSubscriptionUserDropdown = false;
    this.onSubscriptionFilterChange();
  }

  removeSubscriptionUserFilter() {
    this.selectedSubscriptionUser = null;
  }

  toggleSubscriptionPlanDropdown() {
    this.showSubscriptionPlanDropdown = !this.showSubscriptionPlanDropdown;
  }

  selectSubscriptionPlan(plan: SubscriptionPlan | null) {
    this.selectedSubscriptionPlan = plan;
    this.subscriptionPlanFilter = plan ? plan.name : 'all';
    this.showSubscriptionPlanDropdown = false;
    this.onSubscriptionFilterChange();
  }

  filterSubscriptionsByPlan(planName: string) {
    this.subscriptionPlanFilter = planName;
    this.selectedSubscriptionPlan = this.subscriptionPlans.find(p => p.name.toLowerCase() === planName.toLowerCase()) || null;
    this.onSubscriptionFilterChange();
  }

  filterSubscriptionsByDateRange(range: string) {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    switch (range) {
      case 'today':
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'expiring':
        // Show subscriptions expiring in next 7 days
        fromDate = now;
        toDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        this.subscriptionDateFromFilter = fromDate.toISOString().split('T')[0];
        this.subscriptionDateToFilter = toDate.toISOString().split('T')[0];
        this.onSubscriptionDateChange();
        return;
      default:
        return;
    }

    this.subscriptionDateFromFilter = fromDate.toISOString().split('T')[0];
    this.subscriptionDateToFilter = toDate.toISOString().split('T')[0];
    this.onSubscriptionDateChange();
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

  // Set up real-time notification polling
  setupNotificationPolling() {
    // Load notifications immediately
    this.loadNotifications();
    
    // Poll for new notifications every 30 seconds
    setInterval(() => {
      this.loadNotifications();
    }, 30000);
  }

  // Generate notifications for various user activities
  async generateNotification(type: 'subscription' | 'transaction' | 'email' | 'user' | 'system', data: any) {
    try {
      let notification: any = {
        type: type,
        createdAt: new Date().toISOString(),
        isRead: false
      };

      switch (type) {
        case 'subscription':
          if (data.action === 'subscribe') {
            notification.title = 'New Subscription';
            notification.message = `${data.userName} (${data.userEmail}) subscribed to ${data.planName}`;
            notification.relatedId = data.subscriptionId;
          } else if (data.action === 'cancel') {
            notification.title = 'Subscription Cancelled';
            notification.message = `${data.userName} (${data.userEmail}) cancelled their ${data.planName} subscription`;
            notification.relatedId = data.subscriptionId;
          } else if (data.action === 'renew') {
            notification.title = 'Subscription Renewed';
            notification.message = `${data.userName} (${data.userEmail}) renewed their ${data.planName} subscription`;
            notification.relatedId = data.subscriptionId;
          }
          break;

        case 'transaction':
          if (data.type === 'CREDIT') {
            notification.title = 'Funds Added';
            notification.message = `${data.userName} (${data.userEmail}) added ₹${data.amount} to their account`;
          } else {
            notification.title = 'Transaction Made';
            notification.message = `${data.userName} (${data.userEmail}) made a transaction of ₹${data.amount}`;
          }
          notification.relatedId = data.transactionId;
          break;

        case 'email':
          notification.title = 'Email Sent';
          notification.message = `${data.senderName} (${data.senderEmail}) sent an email to ${data.recipient}`;
          notification.relatedId = data.emailId;
          break;

        case 'user':
          if (data.action === 'register') {
            notification.title = 'New User Registration';
            notification.message = `New user ${data.userName} (${data.userEmail}) registered`;
            notification.relatedId = data.userId;
          } else if (data.action === 'login') {
            notification.title = 'User Login';
            notification.message = `${data.userName} (${data.userEmail}) logged in`;
            notification.relatedId = data.userId;
          }
          break;
      }

      // Add to local notifications array for immediate UI update
      this.notifications.unshift(notification);
      this.updateUnreadCount();

      // Send to backend to persist (you'll need to implement the backend endpoint)
      await this.superadminService.createNotification(notification);
    } catch (error) {
      console.error('Error generating notification:', error);
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
    } else if (tab === 'plans' && this.subscriptionPlans.length === 0) {
      this.loadSubscriptionPlans();
    }
  }

  // User management
  get filteredUsers() {
    let filtered = [...this.users];

    // Search filter
    if (this.userSearchTerm) {
      const searchLower = this.userSearchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone.toLowerCase().includes(searchLower) ||
        user.id.toString().includes(searchLower)
      );
    }

    // Role filter
    if (this.userRoleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === this.userRoleFilter);
    }

    // Status filter
    if (this.userStatusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === this.userStatusFilter);
    }

    // Date range filter
    if (this.userDateFromFilter) {
      const fromDate = new Date(this.userDateFromFilter);
      filtered = filtered.filter(user => new Date(user.createdAt) >= fromDate);
    }

    if (this.userDateToFilter) {
      const toDate = new Date(this.userDateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(user => new Date(user.createdAt) <= toDate);
    }

    // Balance range filter
    if (this.userBalanceMinFilter !== null && this.userBalanceMinFilter >= 0) {
      filtered = filtered.filter(user => user.balance >= this.userBalanceMinFilter!);
    }

    if (this.userBalanceMaxFilter !== null && this.userBalanceMaxFilter >= 0) {
      filtered = filtered.filter(user => user.balance <= this.userBalanceMaxFilter!);
    }

    return filtered;
  }



  async impersonateUser(user: User) {
    if (user.role === 'superadmin') {
      return; // Cannot impersonate another superadmin
    }

    try {
      this.isLoading = true;
      
      const response = await this.superadminService.startImpersonation(user);
      
      // Use auth service to begin impersonation
      this.auth.beginImpersonation(response.targetUser, response.impersonationToken);
      
      // Add a small delay to ensure state is properly set before navigation
      setTimeout(() => {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }, 100);
      
    } catch (error) {
      console.error('Error starting impersonation:', error);
      this.error = 'Failed to start user impersonation. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // Transaction management
  get filteredTransactions() {
    let filtered = [...this.transactions];
    
    // Filter by transaction type
    if (this.transactionFilter !== 'all') {
      filtered = filtered.filter(t => t.type === this.transactionFilter);
    }
    
    // Filter by user
    if (this.transactionUserFilter) {
      filtered = filtered.filter(t => 
        t.user.name.toLowerCase().includes(this.transactionUserFilter.toLowerCase()) ||
        t.user.email.toLowerCase().includes(this.transactionUserFilter.toLowerCase())
      );
    }
    
    // General search across transaction data
    if (this.transactionSearchTerm) {
      const searchLower = this.transactionSearchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.user.name.toLowerCase().includes(searchLower) ||
        t.user.email.toLowerCase().includes(searchLower) ||
        t.amount.toString().includes(searchLower) ||
        t.id.toString().includes(searchLower)
      );
    }
    
    // Date range filter
    if (this.transactionDateFromFilter) {
      const fromDate = new Date(this.transactionDateFromFilter);
      filtered = filtered.filter(t => new Date(t.transactionDate) >= fromDate);
    }

    if (this.transactionDateToFilter) {
      const toDate = new Date(this.transactionDateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.transactionDate) <= toDate);
    }

    // Amount range filter
    if (this.transactionAmountMinFilter !== null && this.transactionAmountMinFilter > 0) {
      filtered = filtered.filter(t => t.amount >= this.transactionAmountMinFilter!);
    }

    if (this.transactionAmountMaxFilter !== null && this.transactionAmountMaxFilter > 0) {
      filtered = filtered.filter(t => t.amount <= this.transactionAmountMaxFilter!);
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
    let filtered = [...this.emails];
    
    // Filter by email status
    if (this.emailFilter !== 'all') {
      filtered = filtered.filter(e => e.status === this.emailFilter);
    }
    
    // Filter by user
    if (this.emailUserFilter) {
      filtered = filtered.filter(e => 
        e.to.toLowerCase().includes(this.emailUserFilter.toLowerCase()) ||
        (e.sender?.name && e.sender.name.toLowerCase().includes(this.emailUserFilter.toLowerCase())) ||
        (e.sender?.email && e.sender.email.toLowerCase().includes(this.emailUserFilter.toLowerCase()))
      );
    }
    
    // General search across email data
    if (this.emailSearchTerm) {
      const searchLower = this.emailSearchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.subject.toLowerCase().includes(searchLower) ||
        e.to.toLowerCase().includes(searchLower) ||
        e.body.toLowerCase().includes(searchLower) ||
        e.id.toString().includes(searchLower) ||
        (e.sender?.name && e.sender.name.toLowerCase().includes(searchLower)) ||
        (e.sender?.email && e.sender.email.toLowerCase().includes(searchLower))
      );
    }
    
    // Recipient filter
    if (this.emailRecipientFilter) {
      const recipientLower = this.emailRecipientFilter.toLowerCase();
      filtered = filtered.filter(e => e.to.toLowerCase().includes(recipientLower));
    }
    
    // Subject filter
    if (this.emailSubjectFilter) {
      const subjectLower = this.emailSubjectFilter.toLowerCase();
      filtered = filtered.filter(e => e.subject.toLowerCase().includes(subjectLower));
    }
    
    // Date range filter
    if (this.emailDateFromFilter) {
      const fromDate = new Date(this.emailDateFromFilter);
      filtered = filtered.filter(e => new Date(e.sentAt) >= fromDate);
    }

    if (this.emailDateToFilter) {
      const toDate = new Date(this.emailDateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.sentAt) <= toDate);
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

  selectTransactionUser(user: {name: string, email: string} | null) {
    this.selectedTransactionUser = user;
    this.transactionUserFilter = user ? user.email : '';
    this.showTransactionUserDropdown = false;
    this.onTransactionFilterChange();
  }

  selectEmailUser(user: {name?: string, email: string} | null) {
    this.selectedEmailUser = user;
    this.emailUserFilter = user ? user.email : '';
    this.showEmailUserDropdown = false;
    this.onEmailFilterChange();
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
    this.showSubscriptionPlanDropdown = false;
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
      case 'subscription': return 'pi pi-crown';
      case 'email': return 'pi pi-envelope';
      case 'user': return 'pi pi-user-plus';
      case 'login': return 'pi pi-sign-in';
      case 'security': return 'pi pi-shield';
      case 'system': return 'pi pi-cog';
      default: return 'pi pi-bell';
    }
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'transaction': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'subscription': return 'bg-gradient-to-r from-purple-500 to-indigo-600';
      case 'email': return 'bg-gradient-to-r from-blue-500 to-cyan-600';
      case 'user': return 'bg-gradient-to-r from-orange-500 to-red-600';
      case 'login': return 'bg-gradient-to-r from-blue-500 to-indigo-600';
      case 'system': return 'bg-gradient-to-r from-purple-500 to-pink-600';
      case 'security': return 'bg-gradient-to-r from-red-500 to-pink-600';
      default: return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  }

  getNotificationBadgeClass(type: string): string {
    switch (type) {
      case 'transaction': return 'bg-green-100 text-green-800';
      case 'subscription': return 'bg-purple-100 text-purple-800';
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-orange-100 text-orange-800';
      case 'login': return 'bg-indigo-100 text-indigo-800';
      case 'system': return 'bg-purple-100 text-purple-800';
      case 'security': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getNotificationTypeLabel(type: string): string {
    switch (type) {
      case 'transaction': return 'Transaction';
      case 'subscription': return 'Subscription';
      case 'email': return 'Email';
      case 'user': return 'User';
      case 'login': return 'Login';
      case 'system': return 'System';
      case 'security': return 'Security';
      default: return 'Activity';
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

  // Enhanced filter management methods
  
  // Toggle filter panels
  toggleTransactionFilters() {
    this.showTransactionFilters = !this.showTransactionFilters;
  }

  toggleEmailFilters() {
    this.showEmailFilters = !this.showEmailFilters;
  }

  toggleUserFilters() {
    this.showUserFilters = !this.showUserFilters;
  }

  toggleSubscriptionFilters() {
    this.showSubscriptionFilters = !this.showSubscriptionFilters;
  }

  // Filter by transaction type (quick filters)
  filterTransactionsByType(type: string) {
    this.transactionFilter = type;
    this.updateActiveTransactionFilters();
  }

  // Filter by email status (quick filters)
  filterEmailsByStatus(status: string) {
    this.emailFilter = status;
    this.updateActiveEmailFilters();
  }

  // Filter by user status (quick filters)
  filterUsersByStatus(status: string) {
    this.userStatusFilter = status;
    this.updateActiveUserFilters();
  }

  // Filter by subscription status (quick filters)
  filterSubscriptionsByStatus(status: string) {
    this.subscriptionFilter = status;
    this.updateActiveSubscriptionFilters();
  }

  // Date range quick filters
  filterTransactionsByDateRange(range: string) {
    const today = new Date();
    const startDate = new Date();

    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        this.transactionDateFromFilter = startDate.toISOString().split('T')[0];
        this.transactionDateToFilter = today.toISOString().split('T')[0];
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        this.transactionDateFromFilter = startDate.toISOString().split('T')[0];
        this.transactionDateToFilter = today.toISOString().split('T')[0];
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        this.transactionDateFromFilter = startDate.toISOString().split('T')[0];
        this.transactionDateToFilter = today.toISOString().split('T')[0];
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        this.transactionDateFromFilter = startDate.toISOString().split('T')[0];
        this.transactionDateToFilter = today.toISOString().split('T')[0];
        break;
    }
    this.updateActiveTransactionFilters();
  }

  filterEmailsByDateRange(range: string) {
    const today = new Date();
    const startDate = new Date();

    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        this.emailDateFromFilter = startDate.toISOString().split('T')[0];
        this.emailDateToFilter = today.toISOString().split('T')[0];
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        this.emailDateFromFilter = startDate.toISOString().split('T')[0];
        this.emailDateToFilter = today.toISOString().split('T')[0];
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        this.emailDateFromFilter = startDate.toISOString().split('T')[0];
        this.emailDateToFilter = today.toISOString().split('T')[0];
        break;
    }
    this.updateActiveEmailFilters();
  }

  // Clear all filters
  clearAllTransactionFilters() {
    this.transactionFilter = 'all';
    this.transactionUserFilter = '';
    this.transactionSearchTerm = '';
    this.transactionDateFromFilter = '';
    this.transactionDateToFilter = '';
    this.transactionAmountMinFilter = null;
    this.transactionAmountMaxFilter = null;
    this.selectedTransactionUser = null;
    this.showTransactionUserDropdown = false;
    this.transactionCurrentPage = 1;
    this.transactionSortField = '';
    this.transactionSortDirection = 'asc';
    this.updateActiveTransactionFilters();
  }

  clearAllEmailFilters() {
    this.emailFilter = 'all';
    this.emailUserFilter = '';
    this.emailSearchTerm = '';
    this.emailDateFromFilter = '';
    this.emailDateToFilter = '';
    this.emailRecipientFilter = '';
    this.emailSubjectFilter = '';
    this.selectedEmailUser = null;
    this.showEmailUserDropdown = false;
    this.emailCurrentPage = 1;
    this.emailSortField = '';
    this.emailSortDirection = 'asc';
    this.updateActiveEmailFilters();
  }

  clearAllUserFilters() {
    this.userSearchTerm = '';
    this.userRoleFilter = 'all';
    this.userStatusFilter = 'all';
    this.userDateFromFilter = '';
    this.userDateToFilter = '';
    this.userBalanceMinFilter = null;
    this.userBalanceMaxFilter = null;
    this.userSortField = '';
    this.userSortDirection = 'asc';
    this.updateActiveUserFilters();
  }

  clearAllSubscriptionFilters() {
    this.subscriptionFilter = 'all';
    this.subscriptionPlanFilter = 'all';
    this.subscriptionStatusFilter = '';
    this.subscriptionSearchTerm = '';
    this.subscriptionDateFromFilter = '';
    this.subscriptionDateToFilter = '';
    this.selectedSubscriptionUser = null;
    this.selectedSubscriptionPlan = null;
    this.showSubscriptionUserDropdown = false;
    this.showSubscriptionPlanDropdown = false;
    this.subscriptionCurrentPage = 1;
    this.updateActiveSubscriptionFilters();
  }

  // Update active filter states
  updateActiveTransactionFilters() {
    this.hasActiveTransactionFilters = 
      this.transactionFilter !== 'all' ||
      this.transactionUserFilter !== '' ||
      this.transactionSearchTerm !== '' ||
      this.transactionDateFromFilter !== '' ||
      this.transactionDateToFilter !== '' ||
      (this.transactionAmountMinFilter !== null && this.transactionAmountMinFilter > 0) ||
      (this.transactionAmountMaxFilter !== null && this.transactionAmountMaxFilter > 0);
  }

  updateActiveEmailFilters() {
    this.hasActiveEmailFilters = 
      this.emailFilter !== 'all' ||
      this.emailUserFilter !== '' ||
      this.emailSearchTerm !== '' ||
      this.emailDateFromFilter !== '' ||
      this.emailDateToFilter !== '' ||
      this.emailRecipientFilter !== '' ||
      this.emailSubjectFilter !== '';
  }

  updateActiveUserFilters() {
    this.hasActiveUserFilters = 
      this.userSearchTerm !== '' ||
      this.userRoleFilter !== 'all' ||
      this.userStatusFilter !== 'all' ||
      this.userDateFromFilter !== '' ||
      this.userDateToFilter !== '' ||
      (this.userBalanceMinFilter !== null && this.userBalanceMinFilter >= 0) ||
      (this.userBalanceMaxFilter !== null && this.userBalanceMaxFilter >= 0);
  }

  updateActiveSubscriptionFilters() {
    this.hasActiveSubscriptionFilters = 
      this.subscriptionFilter !== 'all' ||
      this.subscriptionPlanFilter !== 'all' ||
      this.subscriptionStatusFilter !== '' ||
      this.subscriptionSearchTerm !== '' ||
      this.subscriptionDateFromFilter !== '' ||
      this.subscriptionDateToFilter !== '' ||
      this.selectedSubscriptionUser !== null ||
      this.selectedSubscriptionPlan !== null;
  }

  // Get active filter counts
  getActiveTransactionFiltersCount(): number {
    let count = 0;
    if (this.transactionFilter !== 'all') count++;
    if (this.transactionUserFilter !== '') count++;
    if (this.transactionSearchTerm !== '') count++;
    if (this.transactionDateFromFilter !== '' || this.transactionDateToFilter !== '') count++;
    if ((this.transactionAmountMinFilter !== null && this.transactionAmountMinFilter > 0) || 
        (this.transactionAmountMaxFilter !== null && this.transactionAmountMaxFilter > 0)) count++;
    return count;
  }

  getActiveEmailFiltersCount(): number {
    let count = 0;
    if (this.emailFilter !== 'all') count++;
    if (this.emailUserFilter !== '') count++;
    if (this.emailSearchTerm !== '') count++;
    if (this.emailDateFromFilter !== '' || this.emailDateToFilter !== '') count++;
    if (this.emailRecipientFilter !== '') count++;
    if (this.emailSubjectFilter !== '') count++;
    return count;
  }

  getActiveUserFiltersCount(): number {
    let count = 0;
    if (this.userSearchTerm !== '') count++;
    if (this.userRoleFilter !== 'all') count++;
    if (this.userStatusFilter !== 'all') count++;
    if (this.userDateFromFilter !== '' || this.userDateToFilter !== '') count++;
    if ((this.userBalanceMinFilter !== null && this.userBalanceMinFilter >= 0) || 
        (this.userBalanceMaxFilter !== null && this.userBalanceMaxFilter >= 0)) count++;
    return count;
  }

  getActiveSubscriptionFiltersCount(): number {
    let count = 0;
    if (this.subscriptionFilter !== 'all') count++;
    if (this.subscriptionPlanFilter !== 'all') count++;
    if (this.subscriptionSearchTerm !== '') count++;
    if (this.subscriptionDateFromFilter !== '' || this.subscriptionDateToFilter !== '') count++;
    if (this.selectedSubscriptionUser !== null) count++;
    return count;
  }

  // Get filter summaries
  getTransactionFilterSummary(): string {
    const filters = [];
    if (this.transactionFilter !== 'all') filters.push(`Type: ${this.transactionFilter}`);
    if (this.transactionUserFilter) filters.push(`User: ${this.transactionUserFilter}`);
    if (this.transactionSearchTerm) filters.push(`Search: ${this.transactionSearchTerm}`);
    if (this.transactionDateFromFilter || this.transactionDateToFilter) {
      const from = this.transactionDateFromFilter || 'Start';
      const to = this.transactionDateToFilter || 'End';
      filters.push(`Date: ${from} - ${to}`);
    }
    if (this.transactionAmountMinFilter !== null || this.transactionAmountMaxFilter !== null) {
      const min = this.transactionAmountMinFilter || 0;
      const max = this.transactionAmountMaxFilter || '∞';
      filters.push(`Amount: ₹${min} - ₹${max}`);
    }
    return filters.join(', ');
  }

  getEmailFilterSummary(): string {
    const filters = [];
    if (this.emailFilter !== 'all') filters.push(`Status: ${this.emailFilter}`);
    if (this.emailUserFilter) filters.push(`User: ${this.emailUserFilter}`);
    if (this.emailSearchTerm) filters.push(`Search: ${this.emailSearchTerm}`);
    if (this.emailRecipientFilter) filters.push(`Recipient: ${this.emailRecipientFilter}`);
    if (this.emailSubjectFilter) filters.push(`Subject: ${this.emailSubjectFilter}`);
    if (this.emailDateFromFilter || this.emailDateToFilter) {
      const from = this.emailDateFromFilter || 'Start';
      const to = this.emailDateToFilter || 'End';
      filters.push(`Date: ${from} - ${to}`);
    }
    return filters.join(', ');
  }

  getUserFilterSummary(): string {
    const filters = [];
    if (this.userSearchTerm) filters.push(`Search: ${this.userSearchTerm}`);
    if (this.userRoleFilter !== 'all') filters.push(`Role: ${this.userRoleFilter}`);
    if (this.userStatusFilter !== 'all') filters.push(`Status: ${this.userStatusFilter}`);
    if (this.userDateFromFilter || this.userDateToFilter) {
      const from = this.userDateFromFilter || 'Start';
      const to = this.userDateToFilter || 'End';
      filters.push(`Date: ${from} - ${to}`);
    }
    if (this.userBalanceMinFilter !== null || this.userBalanceMaxFilter !== null) {
      const min = this.userBalanceMinFilter || 0;
      const max = this.userBalanceMaxFilter || '∞';
      filters.push(`Balance: ₹${min} - ₹${max}`);
    }
    return filters.join(', ');
  }

  getSubscriptionFilterSummary(): string {
    const filters = [];
    if (this.subscriptionFilter !== 'all') filters.push(`Status: ${this.subscriptionFilter}`);
    if (this.subscriptionStatusFilter !== '') filters.push(`Status: ${this.subscriptionStatusFilter}`);
    if (this.subscriptionPlanFilter !== 'all') {
      const plan = this.subscriptionPlans.find(p => p.id.toString() === this.subscriptionPlanFilter);
      filters.push(`Plan: ${plan?.name || this.subscriptionPlanFilter}`);
    }
    if (this.selectedSubscriptionPlan) filters.push(`Plan: ${this.selectedSubscriptionPlan.name}`);
    if (this.subscriptionSearchTerm) filters.push(`Search: ${this.subscriptionSearchTerm}`);
    if (this.selectedSubscriptionUser) filters.push(`User: ${this.selectedSubscriptionUser.name}`);
    if (this.subscriptionDateFromFilter || this.subscriptionDateToFilter) {
      const from = this.subscriptionDateFromFilter || 'Start';
      const to = this.subscriptionDateToFilter || 'End';
      filters.push(`Date: ${from} - ${to}`);
    }
    return filters.join(', ');
  }

  // Apply filters (trigger filter updates)
  applyTransactionFilters() {
    this.updateActiveTransactionFilters();
    this.transactionCurrentPage = 1;
  }

  applyEmailFilters() {
    this.updateActiveEmailFilters();
    this.emailCurrentPage = 1;
  }

  applyUserFilters() {
    this.updateActiveUserFilters();
  }

  applySubscriptionFilters() {
    this.updateActiveSubscriptionFilters();
    this.subscriptionCurrentPage = 1;
  }

  // Methods to be called when filter inputs change (for ngModelChange)
  onTransactionSearchChange() {
    this.updateActiveTransactionFilters();
    this.transactionCurrentPage = 1;
  }

  onTransactionFilterChange() {
    this.updateActiveTransactionFilters();
    this.transactionCurrentPage = 1;
  }

  onTransactionDateChange() {
    this.updateActiveTransactionFilters();
    this.transactionCurrentPage = 1;
  }

  onTransactionAmountChange() {
    this.updateActiveTransactionFilters();
    this.transactionCurrentPage = 1;
  }

  onEmailSearchChange() {
    this.updateActiveEmailFilters();
    this.emailCurrentPage = 1;
  }

  onEmailFilterChange() {
    this.updateActiveEmailFilters();
    this.emailCurrentPage = 1;
  }

  onEmailDateChange() {
    this.updateActiveEmailFilters();
    this.emailCurrentPage = 1;
  }

  onUserSearchChange() {
    this.updateActiveUserFilters();
  }

  onUserFilterChange() {
    this.updateActiveUserFilters();
  }

  onUserDateChange() {
    this.updateActiveUserFilters();
  }

  onUserBalanceChange() {
    this.updateActiveUserFilters();
  }

  onSubscriptionSearchChange() {
    this.updateActiveSubscriptionFilters();
    this.subscriptionCurrentPage = 1;
  }

  onSubscriptionFilterChange() {
    this.updateActiveSubscriptionFilters();
    this.subscriptionCurrentPage = 1;
  }

  onSubscriptionDateChange() {
    this.updateActiveSubscriptionFilters();
    this.subscriptionCurrentPage = 1;
  }

  // Plans Management Methods
  trackByPlanId(index: number, plan: SubscriptionPlan): number {
    return plan.id;
  }

  getActivePlansCount(): number {
    return this.subscriptionPlans.filter(plan => plan.status === 'active').length;
  }

  getTotalPlansRevenue(): string {
    const total = this.subscriptionPlans.reduce((sum, plan) => {
      return sum + (plan.price * (plan.activeSubscriptionCount || 0));
    }, 0);
    return total.toLocaleString();
  }

  getTotalSubscribers(): number {
    return this.subscriptionPlans.reduce((sum, plan) => {
      return sum + (plan.activeSubscriptionCount || 0);
    }, 0);
  }

  getPlanStatusBadgeColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  openCreatePlanModal() {
    this.editingPlan = null;
    this.resetPlanForm();
    this.showPlanModal = true;
  }

  editPlan(plan: SubscriptionPlan) {
    this.editingPlan = plan;
    this.planForm = {
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      status: plan.status,
      sortOrder: plan.sortOrder,
      emailLimit: plan.emailLimit,
      transactionLimit: plan.transactionLimit,
      features: {
        emailSupport: plan.features?.emailSupport || false,
        prioritySupport: plan.features?.prioritySupport || false,
        analyticsReports: plan.features?.analyticsReports || false,
        customBranding: plan.features?.customBranding || false,
        apiAccess: plan.features?.apiAccess || false
      }
    };
    this.showPlanModal = true;
  }

  async togglePlanStatus(plan: SubscriptionPlan) {
    try {
      const newStatus = plan.status === 'active' ? 'inactive' : 'active';
      await this.superadminService.updateSubscriptionPlan(plan.id, { status: newStatus });
      plan.status = newStatus;
      
      // Generate notification
      await this.generateNotification('system', {
        title: 'Plan Status Changed',
        message: `Plan "${plan.name}" status changed to ${newStatus}`,
        planId: plan.id,
        planName: plan.name
      });
    } catch (error) {
      console.error('Error updating plan status:', error);
    }
  }

  duplicatePlan(plan: SubscriptionPlan) {
    this.editingPlan = null;
    this.planForm = {
      name: `${plan.name} (Copy)`,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      status: 'draft',
      sortOrder: plan.sortOrder + 1,
      emailLimit: plan.emailLimit,
      transactionLimit: plan.transactionLimit,
      features: {
        emailSupport: plan.features?.emailSupport || false,
        prioritySupport: plan.features?.prioritySupport || false,
        analyticsReports: plan.features?.analyticsReports || false,
        customBranding: plan.features?.customBranding || false,
        apiAccess: plan.features?.apiAccess || false
      }
    };
    this.showPlanModal = true;
  }

  async deletePlan(plan: SubscriptionPlan) {
    if (plan.activeSubscriptionCount > 0) {
      alert('Cannot delete a plan with active subscriptions.');
      return;
    }

    if (confirm(`Are you sure you want to delete the plan "${plan.name}"? This action cannot be undone.`)) {
      try {
        await this.superadminService.deleteSubscriptionPlan(plan.id);
        this.subscriptionPlans = this.subscriptionPlans.filter(p => p.id !== plan.id);
        
        // Generate notification
        await this.generateNotification('system', {
          title: 'Plan Deleted',
          message: `Plan "${plan.name}" has been deleted`,
          planId: plan.id,
          planName: plan.name
        });
      } catch (error) {
        console.error('Error deleting plan:', error);
        alert('Failed to delete plan. Please try again.');
      }
    }
  }

  async savePlan() {
    this.isSavingPlan = true;
    try {
      const planData = {
        name: this.planForm.name,
        description: this.planForm.description,
        price: this.planForm.price,
        billingCycle: this.planForm.billingCycle,
        status: this.planForm.status,
        sortOrder: this.planForm.sortOrder,
        emailLimit: this.planForm.emailLimit,
        transactionLimit: this.planForm.transactionLimit,
        features: this.planForm.features
      };

      if (this.editingPlan) {
        // Update existing plan
        const updatedPlan = await this.superadminService.updateSubscriptionPlan(this.editingPlan.id, planData);
        const index = this.subscriptionPlans.findIndex(p => p.id === this.editingPlan!.id);
        if (index !== -1) {
          this.subscriptionPlans[index] = { ...this.subscriptionPlans[index], ...updatedPlan };
        }
        
        // Generate notification
        await this.generateNotification('system', {
          title: 'Plan Updated',
          message: `Plan "${planData.name}" has been updated`,
          planId: this.editingPlan.id,
          planName: planData.name
        });
      } else {
        // Create new plan
        const newPlan = await this.superadminService.createSubscriptionPlan(planData);
        this.subscriptionPlans.unshift(newPlan);
        
        // Generate notification
        await this.generateNotification('system', {
          title: 'New Plan Created',
          message: `New plan "${planData.name}" has been created`,
          planId: newPlan.id,
          planName: planData.name
        });
      }

      this.closePlanModal();
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan. Please try again.');
    } finally {
      this.isSavingPlan = false;
    }
  }

  closePlanModal() {
    this.showPlanModal = false;
    this.editingPlan = null;
    this.resetPlanForm();
  }

  resetPlanForm() {
    this.planForm = {
      name: '',
      description: '',
      price: 0,
      billingCycle: 'monthly',
      status: 'active',
      sortOrder: 1,
      emailLimit: 0,
      transactionLimit: 0,
      features: {
        emailSupport: false,
        prioritySupport: false,
        analyticsReports: false,
        customBranding: false,
        apiAccess: false
      }
    };
  }

  // Role Management Methods
  toggleRoleManagement() {
    this.showRoleManagement = !this.showRoleManagement;
  }

  get filteredRoleUsers() {
    let filtered = [...this.users];

    // Filter by search term
    if (this.roleSearchTerm) {
      const searchTerm = this.roleSearchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by role type
    if (this.roleFilterType) {
      filtered = filtered.filter(user => user.role === this.roleFilterType);
    }

    return filtered;
  }

  onRoleSearchChange() {
    // Filter will update automatically via filteredRoleUsers getter
  }

  onRoleFilterChange() {
    // Filter will update automatically via filteredRoleUsers getter
  }

  getRoleBadgeColor(role: string): string {
    switch (role.toLowerCase()) {
      case 'superadmin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'user':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  async updateUserRole(user: User, event: Event) {
    const target = event.target as HTMLSelectElement;
    const newRole = target.value;
    
    if (user.role === newRole) {
      return; // No change
    }

    // Prevent changing own role
    if (user.id === this.auth.getUser()?.id) {
      console.warn('Cannot change own role');
      target.value = user.role; // Reset the dropdown
      alert('You cannot change your own role for security reasons.');
      return;
    }

    try {
      this.isUpdatingRole = true;
      
      // Call the service to update user role
      const response = await this.superadminService.updateUserRole(user.id, newRole);
      
      // Update local user data
      const userIndex = this.users.findIndex(u => u.id === user.id);
      if (userIndex !== -1) {
        this.users[userIndex].role = newRole;
      }

      // Generate notification for role change
      await this.generateNotification('system', {
        type: 'role_change',
        userName: user.name,
        userEmail: user.email,
        oldRole: user.role,
        newRole: newRole
      });

      // Show success message with instructions
      if (newRole === 'superadmin') {
        alert(`✅ Role Updated Successfully!\n\n${user.name} has been granted superadmin access.\n\nIMPORTANT: The user must log out and log back in to access the superadmin dashboard.`);
      } else {
        alert(`✅ Role Updated Successfully!\n\n${user.name}'s role has been changed to ${newRole}.\n\nIMPORTANT: The user must log out and log back in for changes to take effect.`);
      }

      console.log(`Successfully updated user ${user.name} role from ${user.role} to ${newRole}`);
      
    } catch (error) {
      console.error('Error updating user role:', error);
      // Reset the dropdown to the original value
      target.value = user.role;
      
      alert('❌ Failed to update user role. Please try again.');
    } finally {
      this.isUpdatingRole = false;
    }
  }

  getUserCountByRole(role: string): number {
    return this.users.filter(user => user.role === role).length;
  }
} 