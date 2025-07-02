import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SuperadminService } from '../../../services/superadmin.service';
import { FormsModule } from '@angular/forms';

interface FeeConfig {
  id?: number;
  type?: string;
  minAmount: number | null;
  maxAmount: number | null;
  fee: number | null;
}

@Component({
  selector: 'app-send-money-fee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-money-fee.component.html',
  styleUrls: ['./send-money-fee.component.css']
})
export class SendMoneyFeeComponent implements OnInit {
  userId = '';
  feeConfigs: FeeConfig[] = [];
  editingConfig: FeeConfig = this.getNewConfig();
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
      this.loadFeeConfigs();
    }
  }

  loadFeeConfigs(): void {
    this.isLoading = true;
    this.superadminService.getFeeConfigurations(this.userId).subscribe({
      next: (configs: FeeConfig[]) => {
        this.feeConfigs = configs;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load fee configurations.';
        this.isLoading = false;
      },
    });
  }

  getNewConfig(): FeeConfig {
    return { id: undefined, type: 'send_money', minAmount: null, maxAmount: null, fee: null };
  }

  editConfig(config: FeeConfig): void {
    this.editingConfig = { ...config };
    this.error = null;
  }

  cancelEdit(): void {
    this.editingConfig = this.getNewConfig();
    this.error = null;
  }

  validateInput(): void {
    // Clear error when user starts typing
    this.error = null;
  }

  isFormValid(): boolean {
    return (
      this.editingConfig.minAmount !== null &&
      this.editingConfig.maxAmount !== null &&
      this.editingConfig.fee !== null &&
      this.editingConfig.minAmount >= 0 &&
      this.editingConfig.maxAmount > this.editingConfig.minAmount &&
      this.editingConfig.fee >= 0
    );
  }

  saveConfig(): void {
    this.error = null;
    
    if (!this.isFormValid()) {
      if (this.editingConfig.maxAmount !== null && 
          this.editingConfig.minAmount !== null && 
          this.editingConfig.maxAmount <= this.editingConfig.minAmount) {
        this.error = "Maximum amount must be greater than minimum amount.";
      } else {
        this.error = "All fields are required and must be valid numbers.";
      }
      return;
    }

    if (this.editingConfig.id) {
      // Ensure type is set for updates
      const configToSave = { ...this.editingConfig, type: 'send_money' };
      this.superadminService.updateFeeConfiguration(this.editingConfig.id, configToSave).subscribe({
        next: () => {
          this.loadFeeConfigs();
          this.editingConfig = this.getNewConfig();
        },
        error: (err: any) => (this.error = 'Failed to update tier.'),
      });
    } else {
      // Ensure type is set for new configurations
      const configToSave = { ...this.editingConfig, type: 'send_money' };
      this.superadminService.addFeeConfiguration(this.userId, configToSave).subscribe({
        next: () => {
          this.loadFeeConfigs();
          this.editingConfig = this.getNewConfig();
        },
        error: (err: any) => (this.error = 'Failed to add tier.'),
      });
    }
  }

  deleteConfig(id: number): void {
    if (confirm('Are you sure you want to delete this fee tier?')) {
      this.error = null;
      this.superadminService.deleteFeeConfiguration(id).subscribe({
        next: () => this.loadFeeConfigs(),
        error: (err: any) => (this.error = 'Failed to delete tier.'),
      });
    }
  }
} 