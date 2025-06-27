import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SubscriptionService } from '../../../services/subscription.service';

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

@Component({
  selector: 'app-user-subscription-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-subscription-management.component.html',
  styleUrls: ['./user-subscription-management.component.css']
})
export class UserSubscriptionManagementComponent implements OnInit {
  @Input() userId!: number;

  plans: SubscriptionPlan[] = [];
  monthlyPlan?: SubscriptionPlan;
  quarterlyPlan?: SubscriptionPlan;
  annualPlan?: SubscriptionPlan;

  editingPrices = {
    monthly: 29.99,
    quarterly: 80.97,
    annually: 299.99
  };

  editingLimits = {
    monthly: { emailQuota: 100, transactionLimit: 50 },
    quarterly: { emailQuota: 300, transactionLimit: 150 },
    annually: { emailQuota: 1200, transactionLimit: 600 }
  };

  isLoading = false;
  isSaving = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Get user ID from route if not provided via @Input
    if (!this.userId) {
      const userIdFromRoute = this.route.parent?.snapshot.paramMap.get('id');
      if (userIdFromRoute) {
        this.userId = parseInt(userIdFromRoute, 10);
      }
    }
    
    if (this.userId) {
      this.loadUserPlans();
    } else {
      this.error = 'User ID not found';
    }
  }

  async loadUserPlans(): Promise<void> {
    if (!this.userId) return;

    this.isLoading = true;
    this.error = null;

    try {
      const response = await this.subscriptionService.getUserPlans(this.userId);
      if (response.success) {
        this.plans = response.data;
        this.organizePlans();
        this.updateEditingPrices();
        this.updateEditingLimits();
      } else {
        this.error = 'Failed to load subscription plans';
      }
    } catch (error) {
      console.error('Error loading user plans:', error);
      this.error = 'Failed to load subscription plans';
    } finally {
      this.isLoading = false;
    }
  }

  private organizePlans(): void {
    this.monthlyPlan = this.plans.find(p => p.billingCycle === 'monthly');
    this.quarterlyPlan = this.plans.find(p => p.billingCycle === 'quarterly');
    this.annualPlan = this.plans.find(p => p.billingCycle === 'annually');
  }

  private updateEditingPrices(): void {
    this.editingPrices.monthly = this.monthlyPlan?.price || 29.99;
    this.editingPrices.quarterly = this.quarterlyPlan?.price || 80.97;
    this.editingPrices.annually = this.annualPlan?.price || 299.99;
  }

  private updateEditingLimits(): void {
    this.editingLimits.monthly = {
      emailQuota: this.monthlyPlan?.emailQuota || 100,
      transactionLimit: this.monthlyPlan?.transactionLimit || 50
    };
    this.editingLimits.quarterly = {
      emailQuota: this.quarterlyPlan?.emailQuota || 300,
      transactionLimit: this.quarterlyPlan?.transactionLimit || 150
    };
    this.editingLimits.annually = {
      emailQuota: this.annualPlan?.emailQuota || 1200,
      transactionLimit: this.annualPlan?.transactionLimit || 600
    };
  }

  async updatePlan(billingCycle: 'monthly' | 'quarterly' | 'annually'): Promise<void> {
    this.isSaving = true;
    this.error = null;
    this.successMessage = null;

    try {
      const price = this.editingPrices[billingCycle];
      const emailQuota = this.editingLimits[billingCycle].emailQuota;
      const transactionLimit = this.editingLimits[billingCycle].transactionLimit;
      
      const response = await this.subscriptionService.updateUserPlan(this.userId, billingCycle, { 
        price, 
        emailQuota, 
        transactionLimit 
      });
      
      if (response.success) {
        this.successMessage = `${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)} plan updated successfully!`;
        await this.loadUserPlans();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      } else {
        this.error = 'Failed to update plan';
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      this.error = 'Failed to update plan';
    } finally {
      this.isSaving = false;
    }
  }

  async createMissingPlans(): Promise<void> {
    this.isSaving = true;
    this.error = null;
    this.successMessage = null;

    try {
      const cycles = ['monthly', 'quarterly', 'annually'] as const;
      const existingCycles = this.plans.map(p => p.billingCycle);
      const missingCycles = cycles.filter(cycle => !existingCycles.includes(cycle));

      for (const cycle of missingCycles) {
        const price = this.editingPrices[cycle];
        const emailQuota = this.editingLimits[cycle].emailQuota;
        const transactionLimit = this.editingLimits[cycle].transactionLimit;
        
        await this.subscriptionService.createUserPlan(this.userId, { 
          billingCycle: cycle, 
          price, 
          emailQuota, 
          transactionLimit 
        });
      }

      if (missingCycles.length > 0) {
        this.successMessage = `Created ${missingCycles.length} missing plan(s)!`;
        await this.loadUserPlans();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      } else {
        this.successMessage = 'All plans already exist!';
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      }
    } catch (error) {
      console.error('Error creating plans:', error);
      this.error = 'Failed to create missing plans';
    } finally {
      this.isSaving = false;
    }
  }

  async resetToDefaults(): Promise<void> {
    this.editingPrices = {
      monthly: 29.99,
      quarterly: 80.97,
      annually: 299.99
    };

    this.editingLimits = {
      monthly: { emailQuota: 100, transactionLimit: 50 },
      quarterly: { emailQuota: 300, transactionLimit: 150 },
      annually: { emailQuota: 1200, transactionLimit: 600 }
    };

    const cycles = ['monthly', 'quarterly', 'annually'] as const;
    
    for (const cycle of cycles) {
      await this.updatePlan(cycle);
    }
  }

  async refreshPlans(): Promise<void> {
    await this.loadUserPlans();
  }
} 