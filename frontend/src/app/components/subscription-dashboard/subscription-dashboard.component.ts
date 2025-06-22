import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';

interface UserSubscription {
  id: number;
  userId: number;
  planId: number;
  status: string;
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  autoRenew: boolean;
  emailsUsed: number;
  transactionsUsed: number;
  cancelledAt?: string;
  cancellationReason?: string;
  plan?: any;
  payments?: any[];
}

@Component({
  selector: 'app-subscription-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription-dashboard.component.html',
  styleUrls: ['./subscription-dashboard.component.css']
})
export class SubscriptionDashboardComponent implements OnInit {
  currentSubscription: UserSubscription | null = null;
  subscriptionHistory: UserSubscription[] = [];
  userBalance: number = 0;
  isLoading = false;
  error: string | null = null;
  showCancelModal = false;
  cancelReason = '';
  isUpdatingAutoRenew = false;
  isRefreshing = false;
  lastRefreshed: Date | null = null;
  successMessage: string | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSubscriptionData();
    this.loadUserBalance();
  }

  async loadSubscriptionData(): Promise<void> {
    try {
      this.isLoading = true;
      this.error = null;

      // Load current subscription
      try {
        const currentResponse = await this.subscriptionService.getCurrentSubscription();
        this.currentSubscription = currentResponse.data;
      } catch (error: any) {
        if (error.status !== 404) {
          console.error('Error loading current subscription:', error);
        }
        // 404 is expected if user has no active subscription
        this.currentSubscription = null;
      }

      // Load subscription history
      try {
        const historyResponse = await this.subscriptionService.getUserSubscriptions();
        this.subscriptionHistory = historyResponse.data || [];
      } catch (error) {
        console.error('Error loading subscription history:', error);
        this.subscriptionHistory = [];
      }

      this.lastRefreshed = new Date();

    } catch (error) {
      this.error = 'Failed to load subscription data';
      console.error('Error loading subscription data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadUserBalance(): Promise<void> {
    try {
      const userInfo = this.authService.getUser();
      if (userInfo && userInfo.balance !== undefined) {
        this.userBalance = typeof userInfo.balance === 'number' ? userInfo.balance : parseFloat(userInfo.balance) || 0;
      } else {
        // Fallback to API call
        const profile = await this.authService.getProfile().toPromise();
        this.userBalance = typeof profile.balance === 'number' ? profile.balance : parseFloat(profile.balance) || 0;
      }
    } catch (error) {
      console.error('Error loading user balance:', error);
      this.userBalance = 0;
    }
  }

  // Current Subscription Management
  isSubscriptionActive(): boolean {
    return this.currentSubscription ? 
      this.subscriptionService.isSubscriptionActive(this.currentSubscription) : 
      false;
  }

  getDaysUntilExpiry(): number {
    return this.currentSubscription ? 
      this.subscriptionService.getDaysUntilExpiry(this.currentSubscription) : 
      0;
  }

  isExpiringSoon(): boolean {
    return this.currentSubscription ? 
      this.subscriptionService.isExpiringSoon(this.currentSubscription) : 
      false;
  }

  getNextBillingDate(): Date | null {
    return this.currentSubscription ? 
      this.subscriptionService.getNextBillingDate(this.currentSubscription) : 
      null;
  }

  getEmailUsagePercentage(): number {
    if (!this.currentSubscription?.plan) return 0;
    return this.subscriptionService.getUsagePercentage(
      this.currentSubscription.emailsUsed,
      this.currentSubscription.plan.emailQuota
    );
  }

  getTransactionUsagePercentage(): number {
    if (!this.currentSubscription?.plan) return 0;
    return this.subscriptionService.getUsagePercentage(
      this.currentSubscription.transactionsUsed,
      this.currentSubscription.plan.transactionLimit
    );
  }

  getEmailUsageText(): string {
    if (!this.currentSubscription?.plan) return '';
    return this.subscriptionService.formatUsageText(
      this.currentSubscription.emailsUsed,
      this.currentSubscription.plan.emailQuota,
      'emails'
    );
  }

  getTransactionUsageText(): string {
    if (!this.currentSubscription?.plan) return '';
    return this.subscriptionService.formatUsageText(
      this.currentSubscription.transactionsUsed,
      this.currentSubscription.plan.transactionLimit,
      'transactions'
    );
  }

  getSubscriptionStatusClass(): string {
    if (!this.currentSubscription) return 'badge-secondary';
    return this.subscriptionService.getSubscriptionStatusBadgeClass(this.currentSubscription.status);
  }

  getSubscriptionStatusText(): string {
    if (!this.currentSubscription) return 'No Subscription';
    return this.subscriptionService.getSubscriptionStatusText(this.currentSubscription.status);
  }

  formatBillingCycle(): string {
    if (!this.currentSubscription?.plan) return '';
    return this.subscriptionService.formatBillingCycle(this.currentSubscription.plan.billingCycle);
  }

  // Actions
  async toggleAutoRenew(): Promise<void> {
    if (!this.currentSubscription) return;

    try {
      this.isUpdatingAutoRenew = true;
      this.error = null;

      const updateData = {
        autoRenew: !this.currentSubscription.autoRenew
      };

      await this.subscriptionService.updateSubscription(this.currentSubscription.id, updateData);
      
      // Update local state
      this.currentSubscription.autoRenew = !this.currentSubscription.autoRenew;
      
      // Show success message
      const message = this.currentSubscription.autoRenew ? 
        'Auto-renewal enabled successfully' : 
        'Auto-renewal disabled successfully';
      
      this.showSuccess(message);

    } catch (error: any) {
      this.error = error.error?.message || 'Failed to update auto-renewal setting';
      console.error('Auto-renewal toggle error:', error);
    } finally {
      this.isUpdatingAutoRenew = false;
    }
  }

  async cancelSubscription(): Promise<void> {
    if (!this.currentSubscription) {
      this.error = 'No active subscription to cancel.';
      return;
    }

    const confirmed = window.confirm('Are you sure you want to cancel your subscription? Your access will remain active until the end of the current billing period.');
    if (!confirmed) {
      return;
    }

    try {
      this.isLoading = true;
      this.error = null;
      await this.subscriptionService.cancelSubscription(this.currentSubscription.id, 'User cancelled subscription');
      this.showSuccess('Your subscription has been successfully cancelled and will not auto-renew.');
      // Refresh data to show updated state
      await this.loadSubscriptionData();
    } catch (err: any) {
      this.error = err.error?.message || 'Failed to cancel subscription.';
      console.error('Cancellation error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  openCancelModal(): void {
    this.showCancelModal = true;
    this.cancelReason = '';
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelReason = '';
  }

  navigateToPlans(): void {
    this.router.navigate(['/subscription-plans']);
  }

  navigateToAddFunds(): void {
    this.router.navigate(['/profile']); // Assuming profile has add funds functionality
  }

  async refreshData(): Promise<void> {
    try {
      this.isRefreshing = true;
      this.error = null;
      
      await Promise.all([
        this.loadSubscriptionData(),
        this.loadUserBalance()
      ]);
      
    } catch (error) {
      this.error = 'Failed to refresh data';
      console.error('Error refreshing data:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  clearError(): void {
    this.error = null;
  }

  clearSuccess(): void {
    this.successMessage = null;
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.error = null;
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  // History Management
  getHistoryStatusClass(subscription: UserSubscription): string {
    return this.subscriptionService.getSubscriptionStatusBadgeClass(subscription.status);
  }

  getHistoryStatusText(subscription: UserSubscription): string {
    return this.subscriptionService.getSubscriptionStatusText(subscription.status);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateWithTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Renewal Management
  canRenewEarly(): boolean {
    if (!this.currentSubscription) return false;
    return this.isSubscriptionActive() && 
           this.userBalance >= (this.currentSubscription.plan?.price || 0);
  }

  async renewEarly(): Promise<void> {
    if (!this.currentSubscription) return;

    if (!this.canRenewEarly()) {
      this.error = 'Cannot renew: insufficient wallet balance or inactive subscription';
      return;
    }

    try {
      this.isLoading = true;
      this.error = null;

      // Create a new subscription with the same plan
      const renewalData = {
        planId: this.currentSubscription.planId,
        autoRenew: this.currentSubscription.autoRenew
      };

      await this.subscriptionService.subscribe(renewalData);
      
      // Reload data
      await this.loadSubscriptionData();
      await this.loadUserBalance();
      
      this.showSuccess('Subscription renewed successfully!');

    } catch (error: any) {
      this.error = error.error?.message || 'Failed to renew subscription';
      console.error('Renewal error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Utility Methods
  getUsageBarColor(percentage: number): string {
    if (percentage >= 90) return '#ef4444'; // Red
    if (percentage >= 70) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  }

  isNearingLimit(percentage: number): boolean {
    return percentage >= 80;
  }

  hasUnlimitedFeature(quota: number | null): boolean {
    return quota === null;
  }

  formatBalance(balance: any): string {
    const numBalance = typeof balance === 'number' ? balance : parseFloat(balance) || 0;
    return numBalance.toFixed(2);
  }
} 