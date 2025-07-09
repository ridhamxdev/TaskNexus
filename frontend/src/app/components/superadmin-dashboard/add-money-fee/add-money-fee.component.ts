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
  isNew?: boolean;
  isEditing?: boolean;
  hasChanges?: boolean;
  isDeleted?: boolean;
  touchedFields?: {
    minAmount?: boolean;
    maxAmount?: boolean;
    fee?: boolean;
  };
}

@Component({
  selector: 'app-add-money-fee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-money-fee.component.html',
  styleUrls: ['./add-money-fee.component.css']
})
export class AddMoneyFeeComponent implements OnInit {
  userId: string = '';
  feeConfigs: FeeConfig[] = [];
  originalFeeConfigs: FeeConfig[] = [];
  isLoading = false;
  isSaving = false;
  error: string | null = null;
  successMessage: string | null = null;
  hasAnyChanges = false;

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
    this.error = null;
    this.superadminService.getAddMoneyFeeConfigurations(this.userId).subscribe({
      next: (configs: FeeConfig[]) => {
        this.feeConfigs = configs.map(config => ({
          ...config,
          isNew: false,
          isEditing: false,
          hasChanges: false,
          touchedFields: {}
        }));
        this.originalFeeConfigs = JSON.parse(JSON.stringify(this.feeConfigs));
        this.hasAnyChanges = false;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load fee configurations.';
        this.isLoading = false;
      },
    });
  }

  addNewFeeConfig(): void {
    const newConfig: FeeConfig = {
      id: undefined,
      type: 'add_money',
      minAmount: 0,
      maxAmount: null,
      fee: null,
      isNew: true,
      isEditing: true,
      hasChanges: true,
      touchedFields: {}
    };
    this.feeConfigs.push(newConfig);
    this.hasAnyChanges = true;
    this.clearMessages();
  }

  editConfig(config: FeeConfig): void {
    config.isEditing = true;
    this.clearMessages();
  }

  cancelEdit(config: FeeConfig): void {
    if (config.isNew) {
      // Remove new config from array
      const index = this.feeConfigs.findIndex(c => c === config);
      if (index > -1) {
        this.feeConfigs.splice(index, 1);
      }
    } else {
      // Reset to original values
      const original = this.originalFeeConfigs.find(c => c.id === config.id);
      if (original) {
        Object.assign(config, {
          ...original,
          isEditing: false,
          hasChanges: false,
          touchedFields: {}
        });
      }
    }
    this.updateHasAnyChanges();
  }

  deleteConfig(config: FeeConfig): void {
    if (config.isNew) {
      const index = this.feeConfigs.findIndex(c => c === config);
      if (index > -1) {
        this.feeConfigs.splice(index, 1);
      }
    } else {
      config.isDeleted = true;
      config.isEditing = false;
    }
    this.hasAnyChanges = true;
    this.clearMessages();
  }

  onFieldTouch(config: FeeConfig, field: string): void {
    if (!config.touchedFields) {
      config.touchedFields = {};
    }
    config.touchedFields[field as keyof typeof config.touchedFields] = true;
  }

  hasFieldError(config: FeeConfig, field: string): boolean {
    if (!config.touchedFields?.[field as keyof typeof config.touchedFields]) {
      return false;
    }

    switch (field) {
      case 'minAmount':
        return config.minAmount === null || config.minAmount < 0;
      case 'maxAmount':
        return config.maxAmount === null || 
               (config.minAmount !== null && config.maxAmount <= config.minAmount);
      case 'fee':
        return config.fee === null || config.fee < 0;
      default:
        return false;
    }
  }

  getFieldValidationError(config: FeeConfig, field: string): string {
    if (!this.hasFieldError(config, field)) {
      return '';
    }

    switch (field) {
      case 'minAmount':
        return 'Minimum amount must be 0 or greater';
      case 'maxAmount':
        if (config.maxAmount === null) {
          return 'Maximum amount is required';
        }
        return 'Maximum amount must be greater than minimum amount';
      case 'fee':
        return 'Fee must be 0 or greater';
      default:
        return '';
    }
  }

  getValidationError(): string | null {
    // Check for overlapping ranges
    const validConfigs = this.feeConfigs.filter(config => !config.isDeleted && this.isConfigValid(config));
    
    for (let i = 0; i < validConfigs.length; i++) {
      for (let j = i + 1; j < validConfigs.length; j++) {
        const config1 = validConfigs[i];
        const config2 = validConfigs[j];
        
        if (config1.minAmount !== null && config1.maxAmount !== null &&
            config2.minAmount !== null && config2.maxAmount !== null) {
          
          // Check for overlap
          if (!(config1.maxAmount < config2.minAmount || config2.maxAmount < config1.minAmount)) {
            return `Fee configurations have overlapping ranges: ${config1.minAmount}-${config1.maxAmount} and ${config2.minAmount}-${config2.maxAmount}`;
          }
        }
      }
    }

    return null;
  }

  onConfigChange(config: FeeConfig): void {
    config.hasChanges = true;
    this.hasAnyChanges = true;
    this.clearMessages();
  }

  isConfigValid(config: FeeConfig): boolean {
    return (
      config.minAmount !== null &&
      config.maxAmount !== null &&
      config.fee !== null &&
      config.minAmount >= 0 &&
      config.maxAmount > config.minAmount &&
      config.fee >= 0
    );
  }

  updateHasAnyChanges(): void {
    this.hasAnyChanges = this.feeConfigs.some(config => 
      config.hasChanges || config.isNew || config.isDeleted
    );
  }

  clearMessages(): void {
    this.error = null;
    this.successMessage = null;
  }

  saveAllConfigs(): void {
    this.error = null;
    this.successMessage = null;

    // Mark all fields as touched when trying to save to show validation errors
    this.feeConfigs.forEach(config => {
      if (!config.touchedFields) {
        config.touchedFields = {};
      }
      config.touchedFields.minAmount = true;
      config.touchedFields.maxAmount = true;
      config.touchedFields.fee = true;
    });

    const validationError = this.getValidationError();
    if (validationError) {
      this.error = validationError;
      return;
    }

    this.isSaving = true;
    
    // Prepare configurations for bulk update with proper type conversion
    // Filter out deleted configurations
    const configurationsToSave = this.feeConfigs
      .filter(config => !config.isDeleted)
      .map(config => ({
        id: config.isNew ? undefined : config.id,
        type: 'add_money',
        minAmount: config.minAmount !== null ? Number(config.minAmount) : 0,
        maxAmount: config.maxAmount !== null ? Number(config.maxAmount) : 0,
        fee: config.fee !== null ? Number(config.fee) : 0
      }))
      .filter(config => {
        // Additional validation to ensure all numbers are valid
        return !isNaN(config.minAmount) && !isNaN(config.maxAmount) && !isNaN(config.fee) &&
               config.minAmount >= 0 && config.maxAmount > config.minAmount && config.fee >= 0;
      });

    // Don't check length against all configs since we filtered out deleted ones
    const nonDeletedConfigs = this.feeConfigs.filter(config => !config.isDeleted);
    if (configurationsToSave.length !== nonDeletedConfigs.length) {
      this.error = 'Some configurations contain invalid data. Please check all fields.';
      this.isSaving = false;
      return;
    }

    this.superadminService.bulkUpdateAddMoneyFeeConfigurations(this.userId, configurationsToSave).subscribe({
      next: (response) => {
        this.successMessage = 'Fee configurations saved successfully!';
        this.hasAnyChanges = false;
        this.loadFeeConfigs(); // Reload to get updated data
        this.isSaving = false;
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err: any) => {
        console.error('Fee configuration save error:', err);
        
        // Extract more specific error message
        let errorMessage = 'Failed to save fee configurations. Please try again.';
        if (err?.error?.message) {
          // If it's a validation error, extract the specific field errors
          if (err.error.message.includes('validation failed')) {
            errorMessage = 'Validation failed. Please check that all fields contain valid numbers and ranges do not overlap.';
          } else {
            errorMessage = err.error.message;
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.error = errorMessage;
        this.isSaving = false;
      },
    });
  }

  cancelAllChanges(): void {
    this.feeConfigs = JSON.parse(JSON.stringify(this.originalFeeConfigs));
    this.hasAnyChanges = false;
    this.clearMessages();
  }

  trackByConfig(index: number, config: FeeConfig): number {
    return config.id || index;
  }
} 