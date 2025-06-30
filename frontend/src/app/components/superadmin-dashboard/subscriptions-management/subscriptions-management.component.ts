import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  currentPage = 1;
  itemsPerPage = 10;
  itemsPerPageOptions = [10, 25, 50, 100];
  
  // Sorting
  sortField: string = 'startDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Filter panel state
  showFilters = false;
  hasActiveFilters = false;

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
    
    if (!newStatus || newStatus === '') {
      console.error('Invalid status value');
      return;
    }
    
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
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredSubscriptions.slice(startIndex, endIndex);
  }

  get totalPages() {
    return Math.ceil(this.filteredSubscriptions.length / this.itemsPerPage);
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredSubscriptions.length);
  }

  onPageSizeChange(newSize: number) {
    this.itemsPerPage = newSize;
    this.currentPage = 1;
  }

  goToFirstPage() {
    this.currentPage = 1;
  }

  goToLastPage() {
    this.currentPage = this.totalPages;
  }

  goToPrevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getVisiblePages(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const maxVisiblePages = 5;
    const pages: number[] = [];

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than or equal to max visible pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of visible pages around current page
      let start = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages - 1, start + maxVisiblePages - 3);

      // Adjust start if end is at its maximum
      if (end === totalPages - 1) {
        start = Math.max(2, end - (maxVisiblePages - 3));
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push(-1);
      }

      // Add visible pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push(-1);
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }

  get subscriptionTotalPages() {
    return Math.ceil(this.filteredSubscriptions.length / this.itemsPerPage);
  }

  get subscriptionPaginationInfo() {
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, this.filteredSubscriptions.length);
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
    this.currentPage = 1;
  }

  toggleSubscriptionUserDropdown() {
    this.showSubscriptionUserDropdown = !this.showSubscriptionUserDropdown;
    this.showSubscriptionPlanDropdown = false;
  }

  selectSubscriptionUser(user: {name: string, email: string} | null) {
    this.selectedSubscriptionUser = user;
    this.subscriptionUserFilter = user ? user.email : '';
    this.showSubscriptionUserDropdown = false;
    this.currentPage = 1;
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
    this.currentPage = 1;
  }

  filterSubscriptionsByPlan(planName: string) {
    this.subscriptionPlanFilter = planName;
    this.currentPage = 1;
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
    this.currentPage = 1;
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

  // Summary methods
  getTotalSubscriptionsCount(): number {
    return this.subscriptions.length;
  }

  getSubscriptionsByStatus(status: string) {
    return this.subscriptions.filter(sub => sub.status === status);
  }

  getTotalMonthlyRevenue(): number {
    return this.subscriptions
      .filter(s => s.status === 'active' && s.plan.billingCycle === 'monthly')
      .reduce((sum, s) => sum + s.plan.price, 0);
  }

  // Filter management
  getActiveSubscriptionFiltersCount(): number {
    let count = 0;
    if (this.subscriptionSearchTerm) count++;
    if (this.subscriptionFilter !== 'all') count++;
    if (this.subscriptionUserFilter) count++;
    if (this.subscriptionDateFromFilter) count++;
    if (this.subscriptionDateToFilter) count++;
    if (this.subscriptionPlanFilter !== 'all') count++;
    if (this.subscriptionStatusFilter) count++;
    return count;
  }

  onSubscriptionPageSizeChange() {
    this.currentPage = 1;
  }

  clearAllSubscriptionFilters() {
    this.subscriptionSearchTerm = '';
    this.subscriptionFilter = 'all';
    this.subscriptionUserFilter = '';
    this.subscriptionDateFromFilter = '';
    this.subscriptionDateToFilter = '';
    this.subscriptionPlanFilter = 'all';
    this.subscriptionStatusFilter = '';
    this.currentPage = 1;
    this.updateActiveSubscriptionFilters();
  }

  applySubscriptionFilters() {
    this.currentPage = 1;
    this.updateActiveSubscriptionFilters();
  }

  updateActiveSubscriptionFilters() {
    this.hasActiveSubscriptionFilters = !!(
      this.subscriptionSearchTerm ||
      this.subscriptionFilter !== 'all' ||
      this.subscriptionUserFilter ||
      this.subscriptionDateFromFilter ||
      this.subscriptionDateToFilter ||
      this.subscriptionPlanFilter !== 'all' ||
      this.subscriptionStatusFilter
    );
  }

  // Sort methods
  onSubscriptionSortChange() {
    // Sorting is applied automatically through the filteredSubscriptions getter
  }

  toggleSubscriptionSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  // Status class for badges
  getSubscriptionStatusClass(status: string): string {
    return this.getSubscriptionStatusBadgeColor(status);
  }

  // Export functionality
  exportToPDF() {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Subscriptions Management Report', 14, 15);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 14, 25);
    
    // Add summary statistics
    doc.setFontSize(12);
    doc.text('Summary:', 14, 35);
    doc.setFontSize(10);
    const totalSubscriptions = this.subscriptions.length;
    const activeSubscriptions = this.subscriptions.filter(s => s.status === 'active').length;
    const cancelledSubscriptions = this.subscriptions.filter(s => s.status === 'cancelled').length;
    const monthlyRevenue = this.subscriptions
      .filter(s => s.status === 'active' && s.plan.billingCycle === 'monthly')
      .reduce((sum, s) => sum + s.plan.price, 0);
    
    doc.text(`Total Subscriptions: ${totalSubscriptions}`, 14, 42);
    doc.text(`Active: ${activeSubscriptions}`, 14, 49);
    doc.text(`Cancelled: ${cancelledSubscriptions}`, 14, 56);
    doc.text(`Monthly Revenue: ${this.formatCurrency(monthlyRevenue)}`, 14, 63);
    
    // Prepare table data
    const tableData = this.filteredSubscriptions.map(sub => [
      sub.id.toString(),
      sub.user.name,
      sub.plan.name,
      sub.status,
      this.formatDate(sub.startDate),
      this.formatDate(sub.endDate),
      this.formatCurrency(sub.plan.price)
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Subscription ID', 'User', 'Plan', 'Status', 'Start Date', 'End Date', 'Price']],
      body: tableData,
      startY: 70,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20 }
      }
    });
    
    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`subscriptions-${timestamp}.pdf`);
  }

  onSearchChange() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  onDateChange() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  clearAllFilters() {
    this.subscriptionSearchTerm = '';
    this.subscriptionFilter = 'all';
    this.subscriptionUserFilter = '';
    this.subscriptionDateFromFilter = '';
    this.subscriptionDateToFilter = '';
    this.subscriptionPlanFilter = 'all';
    this.subscriptionStatusFilter = '';
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  applyFilters() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  updateActiveFilters() {
    this.hasActiveFilters = !!(
      this.subscriptionSearchTerm ||
      this.subscriptionFilter !== 'all' ||
      this.subscriptionPlanFilter ||
      this.subscriptionDateFromFilter ||
      this.subscriptionDateToFilter
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.subscriptionSearchTerm) count++;
    if (this.subscriptionFilter !== 'all') count++;
    if (this.subscriptionPlanFilter) count++;
    if (this.subscriptionDateFromFilter) count++;
    if (this.subscriptionDateToFilter) count++;
    return count;
  }

  // Sorting methods
  sortSubscriptions(subscriptions: Subscription[]): Subscription[] {
    if (!this.sortField) return subscriptions;

    return subscriptions.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'startDate':
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        case 'endDate':
          aValue = new Date(a.endDate);
          bValue = new Date(b.endDate);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'plan.name':
          aValue = a.plan.name;
          bValue = b.plan.name;
          break;
        case 'user.name':
          aValue = a.user.name;
          bValue = b.user.name;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onSortChange() {
    // Sorting is applied automatically through the filteredSubscriptions getter
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }
} 