import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-fee-configuration',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="text-white">
      <h3 class="text-xl font-bold mb-4">Fee Configuration</h3>
      <p class="text-gray-400 mb-6">Manage user-specific fees for different services.</p>

      <div class="flex border-b border-gray-700 mb-6">
        <a
          routerLink="./send-money"
          routerLinkActive="border-b-2 border-purple-500 text-white"
          class="px-6 py-3 font-medium text-gray-400 hover:text-white transition-colors"
        >
          Send Money Fees
        </a>
        <a
          routerLink="./subscriptions"
          routerLinkActive="border-b-2 border-purple-500 text-white"
          class="px-6 py-3 font-medium text-gray-400 hover:text-white transition-colors"
        >
          Subscription Fees
        </a>
      </div>

      <router-outlet></router-outlet>
    </div>
  `,
})
export class FeeConfigurationComponent {} 