import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';

@Component({
  selector: 'app-default-fee-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './default-fee-management.component.html',
  styleUrls: ['./default-fee-management.component.css']
})
export class DefaultFeeManagementComponent implements OnInit {
  currentConfig: any = null;
  isEditing: boolean = false;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';

  editForm = {
    feeAmount: 0,
    feeType: 'FIXED',
    minAmount: 0,
    maxAmount: null as number | null,
    isActive: true,
    description: ''
  };

  constructor(private superadminService: SuperadminService) {}

  ngOnInit() {
    this.loadCurrentConfiguration();
  }

  async loadCurrentConfiguration() {
    try {
      this.currentConfig = await this.superadminService.getDefaultFeeConfiguration();
    } catch (error: any) {
      console.error('Error loading default fee configuration:', error);
      // Don't show error message if no configuration exists
      if (error.status !== 404) {
        this.errorMessage = 'Failed to load default fee configuration';
      }
    }
  }

  startEditing() {
    this.isEditing = true;
    // Pre-populate form with current values
    if (this.currentConfig) {
      this.editForm = {
        feeAmount: this.currentConfig.feeAmount,
        feeType: this.currentConfig.feeType,
        minAmount: this.currentConfig.minAmount,
        maxAmount: this.currentConfig.maxAmount,
        isActive: this.currentConfig.isActive,
        description: this.currentConfig.description || ''
      };
    }
  }

  createNew() {
    this.isEditing = true;
    // Reset form for new configuration
    this.editForm = {
      feeAmount: 10,
      feeType: 'FIXED',
      minAmount: 0,
      maxAmount: null,
      isActive: true,
      description: 'Default transaction fee for all money transfers'
    };
  }

  cancelEditing() {
    this.isEditing = false;
    this.clearMessages();
  }

  async saveConfiguration() {
    this.isLoading = true;
    this.clearMessages();

    try {
      if (this.currentConfig) {
        // Update existing configuration
        await this.superadminService.updateDefaultFeeConfiguration(this.currentConfig.id, this.editForm);
        this.successMessage = 'Default fee configuration updated successfully';
      } else {
        // Create new configuration
        await this.superadminService.createDefaultFeeConfiguration(this.editForm);
        this.successMessage = 'Default fee configuration created successfully';
      }

      this.isEditing = false;
      await this.loadCurrentConfiguration();
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (error: any) {
      this.errorMessage = 'Failed to save default fee configuration';
      console.error('Error saving default fee configuration:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }
} 