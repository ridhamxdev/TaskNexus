import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';

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

@Component({
  selector: 'app-subscriptions-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscriptions-management.component.html',
  styleUrls: ['./subscriptions-management.component.css']
})
export class SubscriptionsManagementComponent implements OnInit, OnDestroy {
  subscriptions: Subscription[] = [];
  subscriptionPlans: SubscriptionPlan[] = [];
  selectedUserSubscriptionDetails: UserSubscriptionDetails | null = null;
  showUserSubscriptionModal = false;
  
  // Error handling
  subscriptionsError: string | null = null;
  
  // Filtering and search
  subscriptionFilter = 'all';
  subscriptionUserFilter = '';
  subscriptionSearchTerm = '';
  subscriptionDateFromFilter = '';
  subscriptionDateToFilter = '';
  subscriptionPlanFilter = 'all';
  subscriptionStatusFilter = '';
  
  // Dropdown states
  showSubscriptionFilters = false;
  showSubscriptionUserDropdown = false;
  showSubscriptionPlanDropdown = false;
  hasActiveSubscriptionFilters = false;
  
  // Selected items
  selectedSubscriptionUser: {name: string, email: string} | null = null;
  selectedSubscriptionPlan: SubscriptionPlan | null = null;
  
  // Pagination
  subscriptionCurrentPage = 1;
  subscriptionItemsPerPage = 10;
  subscriptionPageSizes = [5, 10, 25, 50, 100];
  
  // Sorting
  subscriptionSortField: string = '';
  subscriptionSortDirection: 'asc' | 'desc' = 'asc';

  constructor(private superadminService: SuperadminService) {}

  ngOnInit() {
    this.loadSubscriptions();
    this.loadSubscriptionPlans();
  }

  ngOnDestroy() {}

  async loadSubscriptions() {
    try {
      this.subscriptionsError = null;
      const response = await this.superadminService.getAllSubscriptions();
      this.subscriptions = response || [];
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      this.subscriptionsError = 'Failed to load subscriptions. Please try again.';
    }
  }

  async loadSubscriptionPlans() {
    try {
      const response = await this.superadminService.getAllSubscriptionPlans();
      this.subscriptionPlans = response || [];
    } catch (error) {
      console.error('Error loading subscription plans:', error);
    }
  }

  async viewUserSubscriptionDetails(userId: number) {
    try {
      const response = await this.superadminService.getUserSubscriptionDetails(userId);
      this.selectedUserSubscriptionDetails = response;
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
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;
    
    try {
      await this.superadminService.updateUserSubscription(subscriptionId, { status: newStatus });
      await this.loadSubscriptions();
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

    // Apply search filter
    if (this.subscriptionSearchTerm) {
      const searchTerm = this.subscriptionSearchTerm.toLowerCase();
      filtered = filtered.filter(subscription => 
        subscription.user.name.toLowerCase().includes(searchTerm) ||
        subscription.user.email.toLowerCase().includes(searchTerm) ||
        subscription.plan.name.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (this.subscriptionFilter && this.subscriptionFilter !== 'all') {
      filtered = filtered.filter(subscription => subscription.status === this.subscriptionFilter);
    }

    // Apply user filter
    if (this.selectedSubscriptionUser) {
      filtered = filtered.filter(subscription => 
        subscription.user.email === this.selectedSubscriptionUser!.email
      );
    }

    // Apply plan filter
    if (this.selectedSubscriptionPlan) {
      filtered = filtered.filter(subscription => 
        subscription.plan.name === this.selectedSubscriptionPlan!.name
      );
    }

    // Apply date range filter
    if (this.subscriptionDateFromFilter) {
      filtered = filtered.filter(subscription => 
        new Date(subscription.startDate) >= new Date(this.subscriptionDateFromFilter)
      );
    }
    if (this.subscriptionDateToFilter) {
      filtered = filtered.filter(subscription => 
        new Date(subscription.startDate) <= new Date(this.subscriptionDateToFilter)
      );
    }

    return filtered;
  }

  get paginatedSubscriptions() {
    const startIndex = (this.subscriptionCurrentPage - 1) * this.subscriptionItemsPerPage;
    const endIndex = startIndex + this.subscriptionItemsPerPage;
    return this.filteredSubscriptions.slice(startIndex, endIndex);
  }

  get subscriptionTotalPages() {
    return Math.ceil(this.filteredSubscriptions.length / this.subscriptionItemsPerPage);
  }

  get subscriptionPaginationInfo() {
    const startItem = (this.subscriptionCurrentPage - 1) * this.subscriptionItemsPerPage + 1;
    const endItem = Math.min(this.subscriptionCurrentPage * this.subscriptionItemsPerPage, this.filteredSubscriptions.length);
    const totalItems = this.filteredSubscriptions.length;
    return `Showing ${startItem}-${endItem} of ${totalItems} subscriptions`;
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
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'expired':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'suspended':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  clearSubscriptionFilters() {
    this.subscriptionFilter = 'all';
    this.subscriptionUserFilter = '';
    this.subscriptionSearchTerm = '';
    this.subscriptionDateFromFilter = '';
    this.subscriptionDateToFilter = '';
    this.subscriptionPlanFilter = 'all';
    this.subscriptionStatusFilter = '';
    this.selectedSubscriptionUser = null;
    this.selectedSubscriptionPlan = null;
    this.subscriptionCurrentPage = 1;
  }

  toggleSubscriptionUserDropdown() {
    this.showSubscriptionUserDropdown = !this.showSubscriptionUserDropdown;
    this.showSubscriptionPlanDropdown = false;
  }

  selectSubscriptionUser(user: {name: string, email: string} | null) {
    this.selectedSubscriptionUser = user;
    this.subscriptionUserFilter = user ? user.email : '';
    this.showSubscriptionUserDropdown = false;
    this.subscriptionCurrentPage = 1;
  }

  removeSubscriptionUserFilter() {
    this.selectedSubscriptionUser = null;
    this.subscriptionUserFilter = '';
  }

  toggleSubscriptionPlanDropdown() {
    this.showSubscriptionPlanDropdown = !this.showSubscriptionPlanDropdown;
    this.showSubscriptionUserDropdown = false;
  }

  selectSubscriptionPlan(plan: SubscriptionPlan | null) {
    this.selectedSubscriptionPlan = plan;
    this.subscriptionPlanFilter = plan ? plan.name : 'all';
    this.showSubscriptionPlanDropdown = false;
    this.subscriptionCurrentPage = 1;
  }

  filterSubscriptionsByPlan(planName: string) {
    this.subscriptionPlanFilter = planName;
    this.subscriptionCurrentPage = 1;
  }

  filterSubscriptionsByDateRange(range: string) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (range) {
      case 'today':
        this.subscriptionDateFromFilter = todayStr;
        this.subscriptionDateToFilter = todayStr;
        break;
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        this.subscriptionDateFromFilter = weekStart.toISOString().split('T')[0];
        this.subscriptionDateToFilter = todayStr;
        break;
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        this.subscriptionDateFromFilter = monthStart.toISOString().split('T')[0];
        this.subscriptionDateToFilter = todayStr;
        break;
      case 'last-30-days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        this.subscriptionDateFromFilter = thirtyDaysAgo.toISOString().split('T')[0];
        this.subscriptionDateToFilter = todayStr;
        break;
      default:
        this.subscriptionDateFromFilter = '';
        this.subscriptionDateToFilter = '';
        break;
    }
    this.subscriptionCurrentPage = 1;
  }

  get subscriptionUsers() {
    const userMap = new Map();
    this.subscriptions.forEach(subscription => {
      const user = subscription.user;
      if (!userMap.has(user.email)) {
        userMap.set(user.email, {
          name: user.name,
          email: user.email
        });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

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

  toggleSubscriptionFilters() {
    this.showSubscriptionFilters = !this.showSubscriptionFilters;
  }

  filterSubscriptionsByStatus(status: string) {
    this.subscriptionFilter = status;
    this.subscriptionCurrentPage = 1;
  }

  onSubscriptionSearchChange() {
    this.subscriptionCurrentPage = 1;
  }

  onSubscriptionFilterChange() {
    this.subscriptionCurrentPage = 1;
  }

  onSubscriptionDateChange() {
    this.subscriptionCurrentPage = 1;
  }

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
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  getTransactionColor(type: string): string {
    return type === 'CREDIT' ? 'text-green-400' : 'text-red-400';
  }
} 