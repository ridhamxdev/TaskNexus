import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-fee-versions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 class="text-xl font-semibold text-white mb-4">Your Fee Configuration Versions</h3>
      <p class="text-gray-400 text-sm mb-6">Track changes to your fee configurations and see version history.</p>
      
      <div *ngIf="loading" class="text-center py-4">
        <div class="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-purple-400 rounded-full" role="status" aria-label="loading">
          <span class="sr-only">Loading...</span>
        </div>
        <span class="ml-2 text-gray-400">Loading fee versions...</span>
      </div>

      <div *ngIf="!loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Send Money Fees -->
        <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium text-purple-400">Send Money Fees</h4>
            <span *ngIf="sendMoneyVersion" 
                  class="px-2 py-1 rounded-full text-xs font-mono" 
                  [ngClass]="getVersionBadgeClass(sendMoneyVersion.version)">
              v{{ sendMoneyVersion.version }}
            </span>
          </div>
          <div *ngIf="sendMoneyVersion" class="text-sm text-gray-400">
            <p><strong>Last Updated:</strong> {{ sendMoneyVersion.updatedAt | date:'short' }}</p>
            <p *ngIf="sendMoneyVersion.changeDescription" class="mt-2 text-xs">
              {{ sendMoneyVersion.changeDescription }}
            </p>
          </div>
          <div *ngIf="!sendMoneyVersion" class="text-sm text-gray-500">
            No version information available
          </div>
        </div>

        <!-- Add Money Fees -->
        <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium text-purple-400">Add Money Fees</h4>
            <span *ngIf="addMoneyVersion" 
                  class="px-2 py-1 rounded-full text-xs font-mono" 
                  [ngClass]="getVersionBadgeClass(addMoneyVersion.version)">
              v{{ addMoneyVersion.version }}
            </span>
          </div>
          <div *ngIf="addMoneyVersion" class="text-sm text-gray-400">
            <p><strong>Last Updated:</strong> {{ addMoneyVersion.updatedAt | date:'short' }}</p>
            <p *ngIf="addMoneyVersion.changeDescription" class="mt-2 text-xs">
              {{ addMoneyVersion.changeDescription }}
            </p>
          </div>
          <div *ngIf="!addMoneyVersion" class="text-sm text-gray-500">
            No version information available
          </div>
        </div>

        <!-- Subscription Fees -->
        <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium text-purple-400">Subscription Fees</h4>
            <span *ngIf="subscriptionVersion" 
                  class="px-2 py-1 rounded-full text-xs font-mono" 
                  [ngClass]="getVersionBadgeClass(subscriptionVersion.version)">
              v{{ subscriptionVersion.version }}
            </span>
          </div>
          <div *ngIf="subscriptionVersion" class="text-sm text-gray-400">
            <p><strong>Last Updated:</strong> {{ subscriptionVersion.updatedAt | date:'short' }}</p>
            <p *ngIf="subscriptionVersion.changeDescription" class="mt-2 text-xs">
              {{ subscriptionVersion.changeDescription }}
            </p>
          </div>
          <div *ngIf="!subscriptionVersion" class="text-sm text-gray-500">
            No version information available
          </div>
        </div>
      </div>

      <!-- Version History -->
      <div *ngIf="allVersions.length > 0" class="mt-6">
        <details class="group">
          <summary class="cursor-pointer text-purple-400 hover:text-purple-300 mb-4 flex items-center">
            <span class="group-open:hidden">▶ Show Version History ({{ allVersions.length }} versions)</span>
            <span class="hidden group-open:inline">▼ Hide Version History</span>
          </summary>
          <div class="bg-gray-700/50 rounded-lg overflow-hidden border border-gray-600">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-800/50 text-xs text-gray-400 uppercase tracking-wider">
                <tr>
                  <th scope="col" class="px-4 py-3">Fee Type</th>
                  <th scope="col" class="px-4 py-3">Version</th>
                  <th scope="col" class="px-4 py-3">Updated</th>
                  <th scope="col" class="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let version of allVersions" class="border-b border-gray-600 hover:bg-gray-600/30 transition-colors">
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-300">
                      {{ getFeeTypeDisplayName(version.feeType) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="font-mono text-xs px-2 py-1 rounded" [ngClass]="getVersionBadgeClass(version.version)">
                      v{{ version.version }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-400">{{ version.updatedAt | date:'short' }}</td>
                  <td class="px-4 py-3 text-gray-400">{{ version.changeDescription || 'No description' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div *ngIf="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mt-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
          </svg>
          <span class="text-red-400 text-sm">{{ error }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    details[open] summary {
      margin-bottom: 1rem;
    }
  `]
})
export class UserFeeVersionsComponent implements OnInit {
  loading = false;
  error: string | null = null;
  sendMoneyVersion: any = null;
  addMoneyVersion: any = null;
  subscriptionVersion: any = null;
  allVersions: any[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadFeeVersions();
  }

  async loadFeeVersions(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      // Load all fee versions
      this.allVersions = await this.authService.getUserFeeVersions().toPromise() || [];

      // Load current versions for each fee type
      const [sendMoney, addMoney, subscription] = await Promise.all([
        this.authService.getCurrentUserFeeVersion('send_money').toPromise().catch(() => null),
        this.authService.getCurrentUserFeeVersion('add_money').toPromise().catch(() => null),
        this.authService.getCurrentUserFeeVersion('subscription').toPromise().catch(() => null)
      ]);

      this.sendMoneyVersion = sendMoney;
      this.addMoneyVersion = addMoney;
      this.subscriptionVersion = subscription;

    } catch (error) {
      console.error('Error loading fee versions:', error);
      this.error = 'Failed to load fee version information';
    } finally {
      this.loading = false;
    }
  }

  getFeeTypeDisplayName(feeType: string): string {
    const typeNames: { [key: string]: string } = {
      send_money: 'Send Money',
      add_money: 'Add Money',
      subscription: 'Subscription',
    };
    return typeNames[feeType] || feeType;
  }

  getVersionBadgeClass(version: string): string {
    if (!version) return 'bg-gray-500/20 text-gray-300';
    
    const versionParts = version.split('.');
    const majorVersion = parseInt(versionParts[0] || '1');
    const minorVersion = parseInt(versionParts[1] || '0');
    
    if (majorVersion >= 2) {
      return 'bg-red-500/20 text-red-300'; // Major updates
    } else if (minorVersion > 0) {
      return 'bg-yellow-500/20 text-yellow-300'; // Minor updates  
    } else {
      return 'bg-green-500/20 text-green-300'; // Initial version
    }
  }
} 