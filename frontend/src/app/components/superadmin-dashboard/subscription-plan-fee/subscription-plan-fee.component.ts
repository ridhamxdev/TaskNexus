import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SuperadminService } from '../../../services/superadmin.service';
import { FormsModule } from '@angular/forms';

// Add FeeConfigurationType enum
enum FeeConfigurationType {
  SEND_MONEY = 'send_money',
  SUBSCRIPTION = 'subscription'
}

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingCycle: string;
  emailQuota: number | null;
  transactionLimit: number | null;
}

interface SubscriptionFeeConfig {
  id?: number;
  type: FeeConfigurationType;
  subscriptionPlanId: number;
  fee: number;
  subscriptionPlan?: SubscriptionPlan;
}

@Component({
  selector: 'app-subscription-plan-fee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription-plan-fee.component.html',
  styleUrls: ['./subscription-plan-fee.component.css']
})
export class SubscriptionPlanFeeComponent implements OnInit {
  userId = '';
  subscriptionFeeConfigs: SubscriptionFeeConfig[] = [];
  availablePlans: SubscriptionPlan[] = [];
  editingConfig: SubscriptionFeeConfig = this.getNewConfig();
  isLoading = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private superadminService: SuperadminService
  ) {}

  ngOnInit(): void {
    const userId = this.route.parent?.parent?.snapshot.paramMap.get('id');
    if (userId) {
      this.userId = userId;
      this.loadSubscriptionFeeConfigs();
      this.loadAvailablePlans();
    }
  }

  loadSubscriptionFeeConfigs(): void {
    this.isLoading = true;
    this.superadminService.getSubscriptionFeeConfigurations(this.userId).subscribe({
      next: (configs: SubscriptionFeeConfig[]) => {
        this.subscriptionFeeConfigs = configs;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading subscription fee configurations:', err);
        this.error = 'Failed to load subscription fee configurations.';
        this.isLoading = false;
      },
    });
  }

  loadAvailablePlans(): void {
    this.superadminService.getAvailableSubscriptionPlansForFeeConfig(this.userId).subscribe({
      next: (plans: SubscriptionPlan[]) => {
        this.availablePlans = plans;
      },
      error: (err: any) => {
        console.error('Failed to load available plans:', err);
        this.error = 'Failed to load available subscription plans.';
      },
    });
  }

  getNewConfig(): SubscriptionFeeConfig {
    return { 
      type: FeeConfigurationType.SUBSCRIPTION,
      subscriptionPlanId: 0,
      fee: 0
    };
  }

  editConfig(config: SubscriptionFeeConfig): void {
    this.editingConfig = { ...config };
    this.error = null;
  }

  cancelEdit(): void {
    this.editingConfig = this.getNewConfig();
    this.error = null;
    this.loadAvailablePlans(); // Refresh available plans
  }

  validateInput(): void {
    // Clear error when user starts typing
    this.error = null;
  }

  isFormValid(): boolean {
    return (
      this.editingConfig.subscriptionPlanId > 0 &&
      this.editingConfig.fee >= 0
    );
  }

  saveConfig(): void {
    this.error = null;
    
    if (!this.isFormValid()) {
      this.error = "Please select a subscription plan and enter a valid fee amount.";
      return;
    }

    // Ensure the fee is a number and type is correct
    const feeConfig = {
      type: FeeConfigurationType.SUBSCRIPTION,
      subscriptionPlanId: Number(this.editingConfig.subscriptionPlanId),
      fee: Number(this.editingConfig.fee)
    };

    if (this.editingConfig.id) {
      // Update existing configuration
      this.superadminService.updateFeeConfiguration(this.editingConfig.id, feeConfig).subscribe({
        next: () => {
          this.loadSubscriptionFeeConfigs();
          this.editingConfig = this.getNewConfig();
        },
        error: (err: any) => {
          console.error('Error updating fee configuration:', err);
          this.error = 'Failed to update subscription fee configuration.';
        },
      });
    } else {
      // Create new configuration
      this.superadminService.addFeeConfiguration(this.userId, feeConfig).subscribe({
        next: () => {
          this.loadSubscriptionFeeConfigs();
          this.loadAvailablePlans(); // Refresh available plans
          this.editingConfig = this.getNewConfig();
        },
        error: (err: any) => {
          console.error('Error adding fee configuration:', err);
          this.error = 'Failed to add subscription fee configuration.';
        },
      });
    }
  }

  deleteConfig(id: number): void {
    if (confirm('Are you sure you want to delete this subscription fee configuration?')) {
      this.error = null;
      this.superadminService.deleteFeeConfiguration(id).subscribe({
        next: () => {
          this.loadSubscriptionFeeConfigs();
          this.loadAvailablePlans(); // Refresh available plans
        },
        error: (err: any) => {
          console.error('Error deleting fee configuration:', err);
          this.error = 'Failed to delete subscription fee configuration.';
        },
      });
    }
  }
} 