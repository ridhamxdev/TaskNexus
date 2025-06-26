import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SuperadminService } from '../../services/superadmin.service';
import { FormsModule } from '@angular/forms';

interface FeeConfig {
  id?: number;
  minAmount: number | null;
  maxAmount: number | null;
  fee: number | null;
}

@Component({
  selector: 'app-send-money-fee',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Fee Configuration Table -->
      <div class="bg-gray-700/50 rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left font-medium">Amount Range (INR)</th>
              <th class="px-6 py-3 text-left font-medium">Fee (INR)</th>
              <th class="px-6 py-3 text-center font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="isLoading" class="border-t border-gray-700">
              <td colspan="3" class="text-center p-8">
                <i class="pi pi-spin pi-spinner mr-2"></i> Loading fee configurations...
              </td>
            </tr>
            <tr *ngIf="!isLoading && feeConfigs.length === 0" class="border-t border-gray-700">
              <td colspan="3" class="text-center p-8 text-gray-400">
                No fee tiers configured for this user.
              </td>
            </tr>
            <tr *ngFor="let config of feeConfigs; let i = index" class="border-t border-gray-700 hover:bg-gray-700 transition-colors">
              <td class="px-6 py-4">{{ config.minAmount | currency:'INR':'symbol':'1.0-0' }} - {{ config.maxAmount | currency:'INR':'symbol':'1.0-0' }}</td>
              <td class="px-6 py-4">{{ config.fee | currency:'INR':'symbol':'1.2-2' }}</td>
              <td class="px-6 py-4 text-center">
                <button (click)="editConfig(config)" class="text-purple-400 hover:text-purple-300 mr-4">Edit</button>
                <button (click)="deleteConfig(config.id!)" class="text-red-400 hover:text-red-300">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add/Edit Form -->
      <div class="mt-8">
        <h4 class="text-lg font-semibold mb-4">{{ editingConfig.id ? 'Edit' : 'Add New' }} Fee Tier</h4>
        <div class="bg-gray-700/50 rounded-lg p-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-1">Min Amount</label>
              <input type="number" [(ngModel)]="editingConfig.minAmount" placeholder="e.g., 0" class="w-full bg-gray-800 rounded-md border-gray-600">
            </div>
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-1">Max Amount</label>
              <input type="number" [(ngModel)]="editingConfig.maxAmount" placeholder="e.g., 1000" class="w-full bg-gray-800 rounded-md border-gray-600">
            </div>
            <div class="md:col-span-1">
              <label class="block text-sm font-medium text-gray-300 mb-1">Fee</label>
              <input type="number" [(ngModel)]="editingConfig.fee" placeholder="e.g., 50" class="w-full bg-gray-800 rounded-md border-gray-600">
            </div>
            <div class="md:col-span-1 flex items-end space-x-3">
              <button (click)="saveConfig()" class="w-full bg-purple-600 hover:bg-purple-700 rounded-md py-2 font-semibold transition-colors">
                {{ editingConfig.id ? 'Save Changes' : 'Add Tier' }}
              </button>
              <button *ngIf="editingConfig.id" (click)="cancelEdit()" class="w-full bg-gray-600 hover:bg-gray-500 rounded-md py-2 font-semibold transition-colors">
                Cancel
              </button>
            </div>
          </div>
          <div *ngIf="error" class="text-red-400 mt-4">{{ error }}</div>
        </div>
      </div>
    </div>
  `,
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
    // Note: We need to go up two levels to get the user ID from the 'user/:id' route
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
    return { id: undefined, minAmount: null, maxAmount: null, fee: null };
  }

  editConfig(config: FeeConfig): void {
    this.editingConfig = { ...config };
  }

  cancelEdit(): void {
    this.editingConfig = this.getNewConfig();
  }

  saveConfig(): void {
    this.error = null;
    if (!this.editingConfig.minAmount || !this.editingConfig.maxAmount || !this.editingConfig.fee) {
      this.error = "All fields are required.";
      return;
    }

    if (this.editingConfig.id) {
      this.superadminService.updateFeeConfiguration(this.editingConfig.id, this.editingConfig).subscribe({
        next: () => {
          this.loadFeeConfigs();
          this.editingConfig = this.getNewConfig();
        },
        error: (err: any) => (this.error = 'Failed to update tier.'),
      });
    } else {
      this.superadminService.addFeeConfiguration(this.userId, this.editingConfig).subscribe({
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