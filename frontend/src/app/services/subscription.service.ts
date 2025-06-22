import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  emailQuota: number | null;
  transactionLimit: number | null;
  features: any;
  status: string;
  sortOrder: number;
}

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
  plan?: SubscriptionPlan;
  payments?: any[];
}

interface CreateSubscriptionData {
  planId: number;
  autoRenew?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = 'http://localhost:3000/subscriptions';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // User Subscription Methods
  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.get<ApiResponse<SubscriptionPlan[]>>(`${this.apiUrl}/plans`, { headers }));
  }

  async getCurrentSubscription(): Promise<ApiResponse<UserSubscription>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.get<ApiResponse<UserSubscription>>(`${this.apiUrl}/current`, { headers }));
  }

  async getUserSubscriptions(): Promise<ApiResponse<UserSubscription[]>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.get<ApiResponse<UserSubscription[]>>(`${this.apiUrl}/my-subscriptions`, { headers }));
  }

  async subscribe(data: CreateSubscriptionData): Promise<ApiResponse<UserSubscription>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.post<ApiResponse<UserSubscription>>(`${this.apiUrl}/subscribe`, data, { headers }));
  }

  async updateSubscription(subscriptionId: number, data: any): Promise<ApiResponse<UserSubscription>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.put<ApiResponse<UserSubscription>>(`${this.apiUrl}/${subscriptionId}`, data, { headers }));
  }

  async cancelSubscription(subscriptionId: number, reason?: string): Promise<ApiResponse<UserSubscription>> {
    const headers = this.getHeaders();
    const data = reason ? { reason } : {};
    return firstValueFrom(this.http.post<ApiResponse<UserSubscription>>(`${this.apiUrl}/${subscriptionId}/cancel`, data, { headers }));
  }

  // Admin Methods (SuperAdmin only)
  async createPlan(planData: any): Promise<ApiResponse<SubscriptionPlan>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.post<ApiResponse<SubscriptionPlan>>(`${this.apiUrl}/plans`, planData, { headers }));
  }

  async getAllPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.get<ApiResponse<SubscriptionPlan[]>>(`${this.apiUrl}/admin/plans`, { headers }));
  }

  async getAllSubscriptions(params?: any): Promise<ApiResponse<any>> {
    const headers = this.getHeaders();
    const queryParams = new URLSearchParams(params).toString();
    const url = queryParams ? `${this.apiUrl}/admin/subscriptions?${queryParams}` : `${this.apiUrl}/admin/subscriptions`;
    return firstValueFrom(this.http.get<ApiResponse<any>>(url, { headers }));
  }

  async getSubscriptionAnalytics(): Promise<ApiResponse<any>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.get<ApiResponse<any>>(`${this.apiUrl}/admin/analytics`, { headers }));
  }

  async triggerRenewalProcess(): Promise<ApiResponse<any>> {
    const headers = this.getHeaders();
    return firstValueFrom(this.http.post<ApiResponse<any>>(`${this.apiUrl}/admin/run-renewal`, {}, { headers }));
  }

  // Utility Methods
  formatBillingCycle(cycle: string): string {
    switch (cycle) {
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Every 3 Months';
      case 'annually': return 'Yearly';
      default: return cycle;
    }
  }

  calculateSavings(plan: SubscriptionPlan, monthlyPrice: number): number {
    if (plan.billingCycle === 'quarterly') {
      return Math.round(((monthlyPrice * 3) - plan.price) / (monthlyPrice * 3) * 100);
    } else if (plan.billingCycle === 'annually') {
      return Math.round(((monthlyPrice * 12) - plan.price) / (monthlyPrice * 12) * 100);
    }
    return 0;
  }

  getNextBillingDate(subscription: UserSubscription): Date {
    return new Date(subscription.nextBillingDate);
  }

  isSubscriptionActive(subscription: UserSubscription): boolean {
    return subscription.status === 'active' && new Date(subscription.endDate) > new Date();
  }

  getUsagePercentage(used: number, quota: number | null): number {
    if (!quota || quota === 0) return 0; // Unlimited or no quota
    const percentage = Math.min((used / quota) * 100, 100);
    return isNaN(percentage) ? 0 : percentage;
  }

  formatUsageText(used: number, quota: number | null, type: 'emails' | 'transactions'): string {
    if (!quota) {
      return `${used.toLocaleString()} ${type} used (Unlimited)`;
    }
    return `${used.toLocaleString()} / ${quota.toLocaleString()} ${type} used`;
  }

  getDaysUntilExpiry(subscription: UserSubscription): number {
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isExpiringSoon(subscription: UserSubscription, days: number = 7): boolean {
    const daysUntilExpiry = this.getDaysUntilExpiry(subscription);
    return daysUntilExpiry <= days && daysUntilExpiry > 0;
  }

  getSubscriptionStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'suspended': return 'badge-danger';
      case 'cancelled': return 'badge-secondary';
      case 'expired': return 'badge-dark';
      default: return 'badge-secondary';
    }
  }

  getSubscriptionStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'Active';
      case 'pending': return 'Pending';
      case 'suspended': return 'Suspended';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'Expired';
      case 'inactive': return 'Inactive';
      default: return status;
    }
  }

  // Real-time subscription management
  async checkSubscriptionLimits(type: 'email' | 'transaction'): Promise<{ canProceed: boolean; message?: string }> {
    try {
      const response = await this.getCurrentSubscription();
      const subscription = response.data;
      
      if (!subscription || !this.isSubscriptionActive(subscription)) {
        return {
          canProceed: false,
          message: 'No active subscription found. Please subscribe to continue.'
        };
      }

      const plan = subscription.plan;
      if (!plan) {
        return { canProceed: true }; // No plan means no limits
      }

      if (type === 'email') {
        if (plan.emailQuota && subscription.emailsUsed >= plan.emailQuota) {
          return {
            canProceed: false,
            message: `Email quota exceeded. You've used ${subscription.emailsUsed} of ${plan.emailQuota} emails.`
          };
        }
      } else if (type === 'transaction') {
        if (plan.transactionLimit && subscription.transactionsUsed >= plan.transactionLimit) {
          return {
            canProceed: false,
            message: `Transaction limit exceeded. You've used ${subscription.transactionsUsed} of ${plan.transactionLimit} transactions.`
          };
        }
      }

      return { canProceed: true };
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      return { canProceed: true }; // Allow if we can't check
    }
  }
} 