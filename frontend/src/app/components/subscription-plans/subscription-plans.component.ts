import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

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

interface PlansByBilling {
  monthly: SubscriptionPlan[];
  quarterly: SubscriptionPlan[];
  annually: SubscriptionPlan[];
}

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.css']
})
export class SubscriptionPlansComponent implements OnInit {
  plans: SubscriptionPlan[] = [];
  plansByBilling: PlansByBilling = {
    monthly: [],
    quarterly: [],
    annually: []
  };
  selectedBillingCycle: 'monthly' | 'quarterly' | 'annually' = 'monthly';
  selectedPlan: SubscriptionPlan | null = null;
  userBalance: number = 0;
  isLoading = false;
  error: string | null = null;
  currentSubscription: any = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserSpecificPlans();
    this.loadUserBalance();
    this.loadCurrentSubscription();
  }

  async loadUserSpecificPlans(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.subscriptionService.getMyAvailablePlans();
      this.plans = response.data;
      this.organizePlansByBilling();
    } catch (error) {
      this.error = 'Failed to load your personalized subscription plans';
      console.error('Error loading user-specific plans:', error);
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
        const profile = await firstValueFrom(this.authService.getProfile());
        this.userBalance = typeof profile.balance === 'number' ? profile.balance : parseFloat(profile.balance) || 0;
      }
    } catch (error) {
      console.error('Error loading user balance:', error);
      this.userBalance = 0; // Ensure it's always a number
    }
  }

  async loadCurrentSubscription(): Promise<void> {
    try {
      const response = await this.subscriptionService.getCurrentSubscription();
      this.currentSubscription = response.data;
    } catch (error) {
      // User doesn't have active subscription, which is fine
      console.log('No active subscription found');
    }
  }

  organizePlansByBilling(): void {
    this.plansByBilling = {
      monthly: [],
      quarterly: [],
      annually: []
    };
  
    if (this.plans && this.plans.length > 0) {
      this.plansByBilling = {
        monthly: this.plans.filter(plan => plan.billingCycle.toLowerCase() === 'monthly'),
        quarterly: this.plans.filter(plan => plan.billingCycle.toLowerCase() === 'quarterly'),
        annually: this.plans.filter(plan => plan.billingCycle.toLowerCase() === 'annually')
      };
    }
  }

  selectBillingCycle(cycle: string): void {
    this.selectedBillingCycle = cycle as 'monthly' | 'quarterly' | 'annually';
    this.selectedPlan = null;
  }

  selectPlan(plan: SubscriptionPlan): void {
    this.selectedPlan = plan;
  }

  async activateSubscription(): Promise<void> {
    if (!this.selectedPlan) {
      this.error = 'Please select a subscription plan';
      return;
    }

    if ((this.userBalance || 0) < (this.selectedPlan.price || 0)) {
      this.error = 'Insufficient wallet balance. Please add funds to your wallet.';
      return;
    }

    try {
      this.isLoading = true;
      this.error = null;

      const subscriptionData = {
        planId: this.selectedPlan.id,
        autoRenew: true
      };

      await this.subscriptionService.subscribe(subscriptionData);
      
      // Show success message and redirect
      alert('Subscription activated successfully! Your subscription will auto-renew at the same time next ' + this.selectedPlan.billingCycle.replace('ly', ''));
      
      // Redirect to subscription dashboard
      this.router.navigate(['/subscription-dashboard']);
      
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to activate subscription';
      console.error('Subscription error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  getBillingCycleDisplay(cycle: string): string {
    switch (cycle) {
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Every 3 Months';
      case 'annually': return 'Yearly';
      default: return cycle;
    }
  }

  getSavingsText(plan: SubscriptionPlan): string {
    if (plan.billingCycle === 'quarterly') {
      return 'Save 10% vs Monthly';
    } else if (plan.billingCycle === 'annually') {
      return 'Save 20% vs Monthly';
    }
    return '';
  }

  getFeaturesList(features: any): string[] {
    if (!features) return [];
    return Object.entries(features)
      .filter(([key, value]) => value === true)
      .map(([key]) => this.formatFeatureName(key));
  }

  private formatFeatureName(key: string): string {
    return key.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  isPlanRecommended(plan: SubscriptionPlan): boolean {
    // Mark Pro plans as recommended
    return plan.name.toLowerCase().includes('pro');
  }

  canAffordPlan(plan: SubscriptionPlan): boolean {
    return (this.userBalance || 0) >= (plan.price || 0);
  }

  formatBalance(balance: any): string {
    const numBalance = typeof balance === 'number' ? balance : parseFloat(balance) || 0;
    return numBalance.toFixed(2);
  }

  formatShortfall(planPrice: number, balance: any): string {
    const numBalance = typeof balance === 'number' ? balance : parseFloat(balance) || 0;
    const shortfall = planPrice - numBalance;
    return shortfall > 0 ? shortfall.toFixed(2) : '0.00';
  }
} 