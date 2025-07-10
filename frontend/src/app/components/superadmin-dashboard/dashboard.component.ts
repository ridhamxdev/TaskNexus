import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService } from '../../services/auth.service';
import { SuperadminService } from '../../services/superadmin.service';

import { DefaultFeeManagementComponent } from './default-fee-management/default-fee-management.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { UsersManagementComponent } from './users-management/users-management.component';
import { AccountStatementComponent } from './account-statement/account-statement.component';
import { SubscriptionsManagementComponent } from './subscriptions-management/subscriptions-management.component';
import { TransactionsManagementComponent } from './transactions-management/transactions-management.component';
import { SettingsManagementComponent } from './settings-management/settings-management.component';
import { EmailsManagementComponent } from './emails-management/emails-management.component';

import { Subscription as RxjsSubscription } from 'rxjs';

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
  activeUsers: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalEmails: number;
  totalTransactions: number;
  totalRevenue: number;
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

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DefaultFeeManagementComponent,
    SidebarComponent,
    HeaderComponent,
    DashboardOverviewComponent,
    UsersManagementComponent,
    AccountStatementComponent,
    SubscriptionsManagementComponent,
    TransactionsManagementComponent,
    SettingsManagementComponent,
    EmailsManagementComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
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
export class SuperadminDashboardComponent implements OnInit, OnDestroy {
  user: User | null = null;
  balance: number = 0;
  private userSubscription: RxjsSubscription | undefined;

  activeTab: string = 'dashboard';
  
  // Shared data arrays that will be passed to child components
  users: User[] = [];
  emails: Email[] = [];
  transactions: Transaction[] = [];
  dashboardStats: DashboardStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalEmails: 0,
    totalTransactions: 0,
    totalRevenue: 0
  };
  subscriptionStats: SubscriptionStats = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    cancelledSubscriptions: 0,
    expiredSubscriptions: 0,
    expiringSoon: 0,
    subscriptionsThisMonth: 0,
    totalRevenue: 0
  };


  // Loading states
  isLoading = false;
  
  // Error handling properties
  error: string | null = null;
  dataLoadError: string | null = null;
  usersError: string | null = null;
  emailsError: string | null = null;
  transactionsError: string | null = null;

  constructor(
    public auth: AuthService,
    private router: Router,
    private superadminService: SuperadminService
  ) {}

  ngOnInit() {
    // Ensure the latest user profile is fetched on component load
    this.auth.refreshUserProfile();

    this.userSubscription = this.auth.userSubject.subscribe(user => {
      if (user) {
        this.user = user;
        this.balance = user.balance;
      }
    });

    this.loadSharedData();
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  async loadSharedData() {
    this.isLoading = true;
    this.dataLoadError = null;
    try {
      // Get the latest profile data to ensure balance is up-to-date
      await this.auth.getProfile().toPromise();
      
      // Load all required data in parallel for better performance
      const [users, emails, transactions, stats, subStats] = await Promise.all([
        this.superadminService.getAllUsers(),
        this.superadminService.getAllEmails(),
        this.superadminService.getAllTransactions(),
        this.superadminService.getDashboardStats(),
        this.superadminService.getSubscriptionStats()
      ]);

      this.users = users;
      this.emails = emails;
      this.transactions = transactions;
      
      // Update dashboard stats
      if (stats) {
        this.dashboardStats = stats as DashboardStats;
      }

      // Update subscription stats
      if (subStats) {
        this.subscriptionStats = subStats;
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.dataLoadError = 'Failed to load some dashboard components. Please try refreshing.';
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
      this.usersError = 'Failed to load users from database.';
      this.users = [];
    }
  }

  async loadEmails() {
    try {
      this.emailsError = null;
      this.emails = await this.superadminService.getAllEmails();
    } catch (error) {
      console.error('Error loading emails:', error);
      this.emailsError = 'Failed to load emails from database.';
      this.emails = [];
    }
  }

  async loadTransactions() {
    try {
      this.transactionsError = null;
      this.transactions = await this.superadminService.getAllTransactions();
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.transactionsError = 'Failed to load transactions from database.';
      this.transactions = [];
    }
  }



  // Tab management
  setActiveTab(tab: string) {
    this.activeTab = tab;
    // Reload data when switching tabs to ensure fresh data
    this.loadSharedData();
  }

  onTabChanged(tab: string) {
    this.setActiveTab(tab);
  }

  handleQuickAction(action: string) {
    // Simply set the active tab to the selected action
    this.setActiveTab(action);
  }

  // Utility methods
  formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) {
      return '₹0.00';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
} 