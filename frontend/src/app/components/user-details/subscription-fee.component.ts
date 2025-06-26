import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subscription-fee',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-700/50 rounded-lg p-8 text-center text-gray-400">
      <i class="pi pi-cog text-4xl mb-4"></i>
      <h4 class="text-xl font-semibold text-white mb-2">Subscription Fee Management</h4>
      <p>This section is under construction. Soon, you will be able to manage user-specific subscription fees here.</p>
    </div>
  `,
})
export class SubscriptionFeeComponent {} 