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
  selector: 'app-send-money-fee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-money-fee.component.html',
  styleUrls: ['./send-money-fee.component.css']
})
export class SendMoneyFeeComponent implements OnInit {
  userId = '';
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
    this.superadminService.getFeeConfigurations(this.userId).subscribe({
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
      type: 'send_money',
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

  cancelEdit(config: FeeConfig, index: number): void {
    if (config.isNew) {
      // Remove new config
      this.feeConfigs.splice(index, 1);
      // Check if there are still changes after removing new config
      this.hasAnyChanges = this.feeConfigs.some(c => c.hasChanges || c.isNew) || 
                           this.feeConfigs.length !== this.originalFeeConfigs.length;
          } else {
        // Reset to original values
        const originalConfig = this.originalFeeConfigs.find(c => c.id === config.id);
        if (originalConfig) {
          this.feeConfigs[index] = {
            ...originalConfig,
            isEditing: false,
            hasChanges: false,
            touchedFields: {}
          };
          // Check if there are still changes after resetting
          this.hasAnyChanges = this.feeConfigs.some(c => c.hasChanges || c.isNew) || 
                               this.feeConfigs.length !== this.originalFeeConfigs.length;
        }
      }
    this.clearMessages();
  }

  deleteConfig(index: number): void {
    if (confirm('Are you sure you want to delete this fee tier?')) {
      this.feeConfigs.splice(index, 1);
      this.hasAnyChanges = true;
      this.clearMessages();
    }
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

  getFieldValidationError(config: FeeConfig, field: 'minAmount' | 'maxAmount' | 'fee'): string | null {
    // Only show validation errors for fields that have been touched or when trying to save
    const isFieldTouched = config.touchedFields?.[field] || false;
    if (!isFieldTouched) {
      return null;
    }

    if (field === 'minAmount') {
      if (config.minAmount === null || config.minAmount === undefined) {
        return 'Minimum amount is required';
      }
      if (config.minAmount < 0) {
        return 'Minimum amount must be greater than or equal to 0';
      }
    }
    
    if (field === 'maxAmount') {
      if (config.maxAmount === null || config.maxAmount === undefined) {
        return 'Maximum amount is required';
      }
      if (config.minAmount !== null && config.maxAmount <= config.minAmount) {
        return 'Maximum amount must be greater than minimum amount';
      }
    }
    
    if (field === 'fee') {
      if (config.fee === null || config.fee === undefined) {
        return 'Fee amount is required';
      }
      if (config.fee < 0) {
        return 'Fee amount cannot be negative';
      }
    }
    
    return null;
  }

  hasFieldError(config: FeeConfig, field: 'minAmount' | 'maxAmount' | 'fee'): boolean {
    return this.getFieldValidationError(config, field) !== null;
  }

  onFieldTouch(config: FeeConfig, field: 'minAmount' | 'maxAmount' | 'fee'): void {
    if (!config.touchedFields) {
      config.touchedFields = {};
    }
    config.touchedFields[field] = true;
  }

  hasUnsavedChanges(): boolean {
    return this.hasAnyChanges || this.feeConfigs.some(config => config.hasChanges || config.isNew);
  }

  hasValidationErrors(): boolean {
    // Check if any config has validation errors
    const hasInvalidConfigs = this.feeConfigs.some(config => !this.isConfigValid(config));
    if (hasInvalidConfigs) {
      return true;
    }

    // Check for overlapping ranges (allow adjacent ranges where max of one equals min of next)
    const sortedConfigs = this.feeConfigs
      .filter(config => config.minAmount !== null && config.maxAmount !== null)
      .sort((a, b) => a.minAmount! - b.minAmount!);

    for (let i = 0; i < sortedConfigs.length - 1; i++) {
      const current = sortedConfigs[i];
      const next = sortedConfigs[i + 1];
      // Only consider it an overlap if current max is greater than next min (not equal)
      if (current.maxAmount! > next.minAmount!) {
        return true;
      }
    }

    return false;
  }

  getValidationError(): string | null {
    // Check for invalid configs
    for (let i = 0; i < this.feeConfigs.length; i++) {
      const config = this.feeConfigs[i];
      if (!this.isConfigValid(config)) {
        if (config.minAmount === null || config.maxAmount === null || config.fee === null) {
          return `Row ${i + 1}: All fields are required.`;
        }
        if (config.minAmount !== null && config.minAmount < 0) {
          return `Row ${i + 1}: Minimum amount must be greater than or equal to 0.`;
        }
        if (config.fee !== null && config.fee < 0) {
          return `Row ${i + 1}: Fee amount cannot be negative.`;
        }
        if (config.minAmount !== null && config.maxAmount !== null && config.maxAmount <= config.minAmount) {
          return `Row ${i + 1}: Maximum amount (${config.maxAmount}) must be greater than minimum amount (${config.minAmount}).`;
        }
      }
    }

    // Check for overlapping ranges (allow adjacent ranges where max of one equals min of next)
    const sortedConfigs = this.feeConfigs
      .filter(config => config.minAmount !== null && config.maxAmount !== null)
      .map((config, index) => ({ ...config, originalIndex: index }))
      .sort((a, b) => a.minAmount! - b.minAmount!);

    for (let i = 0; i < sortedConfigs.length - 1; i++) {
      const current = sortedConfigs[i];
      const next = sortedConfigs[i + 1];
      // Only consider it an overlap if current max is greater than next min (not equal)
      if (current.maxAmount! > next.minAmount!) {
        return `Amount ranges overlap between rows ${current.originalIndex + 1} and ${next.originalIndex + 1}. Range ${current.originalIndex + 1} ends at ${current.maxAmount} but range ${next.originalIndex + 1} starts at ${next.minAmount}.`;
      }
    }

    return null;
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
    const configurationsToSave = this.feeConfigs.map(config => ({
      id: config.isNew ? undefined : config.id,
      type: 'send_money',
      minAmount: config.minAmount !== null ? Number(config.minAmount) : 0,
      maxAmount: config.maxAmount !== null ? Number(config.maxAmount) : 0,
      fee: config.fee !== null ? Number(config.fee) : 0
    })).filter(config => {
      // Additional validation to ensure all numbers are valid
      return !isNaN(config.minAmount) && !isNaN(config.maxAmount) && !isNaN(config.fee) &&
             config.minAmount >= 0 && config.maxAmount > config.minAmount && config.fee >= 0;
    });

    // Check if any configurations were filtered out due to invalid data
    if (configurationsToSave.length !== this.feeConfigs.length) {
      this.error = 'Some configurations contain invalid data. Please check all fields.';
      this.isSaving = false;
      return;
    }

    this.superadminService.bulkUpdateFeeConfigurations(this.userId, configurationsToSave).subscribe({
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

  discardChanges(): void {
    if (confirm('Are you sure you want to discard all changes?')) {
      this.hasAnyChanges = false;
      this.loadFeeConfigs();
    }
  }

  private clearMessages(): void {
    this.error = null;
    this.successMessage = null;
  }
} 