import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about-user',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="user" class="text-white space-y-8">
      
      <!-- Profile and Subscription Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Basic Info Card -->
        <div class="bg-gray-700/50 rounded-lg p-6 lg:col-span-1">
          <h4 class="font-semibold text-lg mb-4 text-gray-300">Basic Information</h4>
          <div class="space-y-4 text-sm">
            <div class="flex items-center">
              <i class="pi pi-user mr-3 text-purple-400"></i><span class="text-gray-400 mr-2">Name:</span> <span class="font-medium">{{ user.username }}</span>
            </div>
            <div class="flex items-center">
              <i class="pi pi-envelope mr-3 text-purple-400"></i><span class="text-gray-400 mr-2">Email:</span> <span class="font-medium">{{ user.email }}</span>
            </div>
            <div class="flex items-center">
              <i class="pi pi-phone mr-3 text-purple-400"></i><span class="text-gray-400 mr-2">Phone:</span> <span class="font-medium">{{ user.phone_number }}</span>
            </div>
            <div class="flex items-center">
              <i class="pi pi-hashtag mr-3 text-purple-400"></i><span class="text-gray-400 mr-2">ID:</span> <span class="font-medium">{{ user.id }}</span>
            </div>
          </div>
        </div>

        <!-- Account Details Card -->
        <div class="bg-gray-700/50 rounded-lg p-6 lg:col-span-1">
          <h4 class="font-semibold text-lg mb-4 text-gray-300">Account Details</h4>
          <div class="space-y-4 text-sm">
            <div class="flex items-center">
                <i class="pi pi-wallet mr-3 text-purple-400"></i><span class="text-gray-400 mr-2">Balance:</span> <span class="font-medium text-green-400">{{ user.balance | currency:'INR' }}</span>
            </div>
            <div class="flex items-center">
                <i class="pi pi-shield mr-3 text-purple-400"></i><span class="text-gray-400 mr-2">Role:</span> <span class="px-2 py-1 rounded-full text-xs bg-blue-500/30 text-blue-300">{{ user.role | titlecase }}</span>
            </div>
            <div class="flex items-center">
                <i class="pi pi-check-circle mr-3 text-purple-400"></i><span class="text-gray-400 mr-2">Status:</span> <span class="font-medium" [ngClass]="user.status === 'Active' ? 'text-green-400' : 'text-red-400'">{{ user.status }}</span>
            </div>
             <div class="flex items-center">
              <i class="pi pi-calendar-plus mr-3 text-purple-400"></i><span class="text-gray-400 mr-2">Joined:</span><span class="font-medium">{{ user.createdAt | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>

        <!-- Active Subscription Card -->
        <div class="bg-gray-700/50 rounded-lg p-6 lg:col-span-1">
          <h4 class="font-semibold text-lg mb-4 text-gray-300">Active Subscription</h4>
          <div *ngIf="activeSubscription; else noSubscription" class="space-y-3 text-sm">
             <div>
                <span class="font-bold text-purple-400 text-lg">{{ activeSubscription.plan.name }}</span>
                <span class="ml-2 px-2 py-1 rounded-full text-xs" [ngClass]="getSubscriptionStatusBadge(activeSubscription.status)">
                    {{ activeSubscription.status | titlecase }}
                </span>
            </div>
            <p class="text-gray-400">{{ activeSubscription.plan.description }}</p>
            <div class="pt-2">
                <p><strong>Price:</strong> {{ activeSubscription.plan.price | currency:'INR' }} / {{ activeSubscription.plan.billingCycle }}</p>
                <p><strong>Expires:</strong> {{ activeSubscription.endDate | date:'mediumDate' }}</p>
            </div>
          </div>
          <ng-template #noSubscription>
            <p class="text-gray-400 text-sm">No active subscription found for this user.</p>
          </ng-template>
        </div>
      </div>

      <!-- Recent Transactions Table -->
      <div>
        <h4 class="font-semibold text-lg mb-4 text-gray-300">Recent Transactions</h4>
        <div class="bg-gray-700/50 rounded-lg overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-800/50 text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th scope="col" class="px-6 py-3">Date</th>
                <th scope="col" class="px-6 py-3">Description</th>
                <th scope="col" class="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of user.transactions" class="border-b border-gray-700 hover:bg-gray-700/70">
                <td class="px-6 py-4 whitespace-nowrap">{{ tx.transactionDate | date:'short' }}</td>
                <td class="px-6 py-4">{{ tx.description }}</td>
                <td class="px-6 py-4 text-right" [ngClass]="tx.type === 'credit' ? 'text-green-400' : 'text-red-400'">
                  {{ tx.type === 'credit' ? '+' : '-' }}{{ tx.amount | currency:'INR' }}
                </td>
              </tr>
              <tr *ngIf="!user.transactions || user.transactions.length === 0">
                <td colspan="3" class="text-center py-4 text-gray-500">No recent transactions found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Emails Table -->
      <div>
        <h4 class="font-semibold text-lg mb-4 text-gray-300">Recent Emails Sent</h4>
        <div class="bg-gray-700/50 rounded-lg overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-800/50 text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th scope="col" class="px-6 py-3">Date</th>
                <th scope="col" class="px-6 py-3">Subject</th>
                <th scope="col" class="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let email of user.emails" class="border-b border-gray-700 hover:bg-gray-700/70">
                <td class="px-6 py-4 whitespace-nowrap">{{ email.createdAt | date:'short' }}</td>
                <td class="px-6 py-4">{{ email.subject }}</td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded-full text-xs" [ngClass]="email.status === 'sent' ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'">
                    {{ email.status | titlecase }}
                  </span>
                </td>
              </tr>
               <tr *ngIf="!user.emails || user.emails.length === 0">
                <td colspan="3" class="text-center py-4 text-gray-500">No recent emails found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
    <div *ngIf="error" class="text-red-500">{{ error }}</div>
    <div *ngIf="!user && !error">
      <i class="pi pi-spin pi-spinner mr-2"></i>
      Loading user details...
    </div>
  `,
})
export class AboutUserComponent implements OnInit {
  @Input() user: any;
  activeSubscription: any;
  error: string | null = null;

  constructor() {}

  ngOnInit(): void {
    if (this.user && this.user.subscriptions) {
      this.activeSubscription = this.user.subscriptions.find((s: any) => s.status === 'active');
    }
  }

  getSubscriptionStatusBadge(status: string): string {
    const statusClasses: { [key: string]: string } = {
      active: 'bg-green-500/30 text-green-300',
      cancelled: 'bg-red-500/30 text-red-300',
      expired: 'bg-yellow-500/30 text-yellow-300',
    };
    return statusClasses[status] || 'bg-gray-500/30 text-gray-300';
  }
} 