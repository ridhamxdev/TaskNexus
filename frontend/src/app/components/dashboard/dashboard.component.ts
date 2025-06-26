import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { SubscriptionService } from '../../services/subscription.service';
import { TwoFactorSettingsComponent } from '../two-factor-settings/two-factor-settings.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule,
    TwoFactorSettingsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentTime: string = '';
  show2FASettings: boolean = false;
  
  // Add Money functionality
  showAddMoney: boolean = false;
  addMoneyAmount: number | null = null;
  isAddingMoney: boolean = false;
  addMoneyError: string = '';
  addMoneySuccess: string = '';

  // Send Money functionality
  showSendMoney: boolean = false;
  sendMoneyAmount: number | null = null;
  recipientEmail: string = '';
  isSendingMoney: boolean = false;
  sendMoneyError: string = '';
  sendMoneySuccess: string = '';

  // Recent Transactions
  recentTransactions: Transaction[] = [];
  isLoadingTransactions: boolean = false;
  transactionError: string = '';

  // Subscription Information
  currentSubscription: any = null;
  isLoadingSubscription: boolean = false;
  subscriptionError: string = '';

  constructor(
    public auth: AuthService, 
    private router: Router,
    private transactionService: TransactionService,
    private subscriptionService: SubscriptionService
  ) {
    this.updateTime();
    // Update time every second
    setInterval(() => this.updateTime(), 1000);
  }

  ngOnInit(): void {
    this.loadRecentTransactions();
    this.loadCurrentSubscription();
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private updateTime(): void {
    this.currentTime = new Date().toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Add Money methods
  toggleAddMoney(): void {
    this.showAddMoney = !this.showAddMoney;
    this.resetAddMoneyForm();
  }

  cancelAddMoney(): void {
    this.showAddMoney = false;
    this.resetAddMoneyForm();
  }

  private resetAddMoneyForm(): void {
    this.addMoneyAmount = null;
    this.addMoneyError = '';
    this.addMoneySuccess = '';
    this.isAddingMoney = false;
  }

  addMoney(): void {
    if (!this.addMoneyAmount || this.addMoneyAmount <= 0) {
      this.addMoneyError = 'Please enter a valid amount';
      return;
    }

    if (this.addMoneyAmount > 100000) {
      this.addMoneyError = 'Maximum amount allowed is ₹1,00,000';
      return;
    }

    this.isAddingMoney = true;
    this.addMoneyError = '';
    this.addMoneySuccess = '';

         // Call the auth service to add money
     this.auth.addMoney(this.addMoneyAmount).subscribe({
       next: (response: any) => {
         // Update the user's balance in the auth service
         const currentUser = this.auth.getUser();
         if (currentUser) {
           currentUser.balance = response.newBalance;
           this.auth.setUser(currentUser);
         }
         
         this.addMoneySuccess = `₹${this.addMoneyAmount?.toLocaleString()} added successfully!`;
         this.isAddingMoney = false;
         
         // Refresh recent transactions to show the new transaction
         this.loadRecentTransactions();
         
         // Auto-close after 3 seconds
         setTimeout(() => {
           this.showAddMoney = false;
           this.resetAddMoneyForm();
         }, 3000);
       },
       error: (error: any) => {
         this.addMoneyError = error.error?.message || 'Failed to add money. Please try again.';
         this.isAddingMoney = false;
       }
     });
  }

  // Send Money methods
  toggleSendMoney(): void {
    this.showSendMoney = !this.showSendMoney;
    this.resetSendMoneyForm();
  }

  cancelSendMoney(): void {
    this.showSendMoney = false;
    this.resetSendMoneyForm();
  }

  private resetSendMoneyForm(): void {
    this.sendMoneyAmount = null;
    this.recipientEmail = '';
    this.sendMoneyError = '';
    this.sendMoneySuccess = '';
    this.isSendingMoney = false;
  }

  sendMoney(): void {
    if (!this.sendMoneyAmount || this.sendMoneyAmount <= 0) {
      this.sendMoneyError = 'Please enter a valid amount';
      return;
    }

    if (!this.recipientEmail) {
      this.sendMoneyError = "Please enter the recipient's email";
      return;
    }

    this.isSendingMoney = true;
    this.sendMoneyError = '';
    this.sendMoneySuccess = '';

    this.transactionService.sendMoney(this.recipientEmail, this.sendMoneyAmount).subscribe({
      next: (response: any) => {
        const currentUser = this.auth.getUser();
        if (currentUser) {
          currentUser.balance = response.newBalance;
          this.auth.setUser(currentUser);
        }
        
        this.sendMoneySuccess = `₹${this.sendMoneyAmount?.toLocaleString()} sent to ${this.recipientEmail} successfully!`;
        this.isSendingMoney = false;
        
        this.loadRecentTransactions();
        
        setTimeout(() => {
          this.showSendMoney = false;
          this.resetSendMoneyForm();
        }, 3000);
      },
      error: (error: any) => {
        this.sendMoneyError = error.error?.message || 'Failed to send money. Please try again.';
        this.isSendingMoney = false;
      }
    });
  }

  // Recent Transactions methods
  loadRecentTransactions(): void {
    if (!this.auth.isLoggedIn()) {
      return;
    }

    const user = this.auth.getUser();
    if (!user || !user.id) {
      // Try to get user profile first
      this.auth.getProfile().subscribe({
        next: (profile) => {
          this.auth.setUser(profile);
          this.fetchRecentTransactions(profile.id.toString());
        },
        error: (err) => {
          this.transactionError = 'Could not load user profile';
        }
      });
      return;
    }

    this.fetchRecentTransactions(user.id.toString());
  }

  private fetchRecentTransactions(userId: string): void {
    this.isLoadingTransactions = true;
    this.transactionError = '';

    this.transactionService.getTransactionsForUser(userId).subscribe({
      next: (transactions) => {
        // Get only the 5 most recent transactions
        this.recentTransactions = transactions
          .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
          .slice(0, 5);
        this.isLoadingTransactions = false;
      },
      error: (err) => {
        this.transactionError = 'Failed to load recent transactions';
        this.isLoadingTransactions = false;
      }
    });
  }

  // Helper methods for transaction display
  getTransactionIcon(type: string): string {
    return type === 'CREDIT' ? 'pi-arrow-down' : 'pi-arrow-up';
  }

  getTransactionClass(type: string): string {
    return type === 'CREDIT' ? 'credit' : 'debit';
  }

  formatTransactionAmount(amount: number, type: string): string {
    const prefix = type === 'CREDIT' ? '+' : '-';
    return `${prefix}₹${amount.toLocaleString()}`;
  }

  // Subscription methods
  loadCurrentSubscription(): void {
    if (!this.auth.isLoggedIn()) {
      return;
    }

    this.isLoadingSubscription = true;
    this.subscriptionError = '';

    this.subscriptionService.getCurrentSubscription().then(response => {
      if (response.success) {
        this.currentSubscription = response.data;
      } else {
        this.currentSubscription = null;
      }
      this.isLoadingSubscription = false;
    }).catch(error => {
      this.subscriptionError = 'Failed to load subscription information';
      this.isLoadingSubscription = false;
      this.currentSubscription = null;
    });
  }

  getSubscriptionStatusClass(): string {
    if (!this.currentSubscription) return '';
    return this.subscriptionService.getSubscriptionStatusBadgeClass(this.currentSubscription.status);
  }

  getSubscriptionStatusText(): string {
    if (!this.currentSubscription) return '';
    return this.subscriptionService.getSubscriptionStatusText(this.currentSubscription.status);
  }

  isSubscriptionActive(): boolean {
    if (!this.currentSubscription) return false;
    return this.subscriptionService.isSubscriptionActive(this.currentSubscription);
  }

  isExpiringSoon(): boolean {
    if (!this.currentSubscription) return false;
    return this.subscriptionService.isExpiringSoon(this.currentSubscription, 7);
  }

  getDaysUntilExpiry(): number {
    if (!this.currentSubscription) return 0;
    return this.subscriptionService.getDaysUntilExpiry(this.currentSubscription);
  }

  getEmailUsagePercentage(): number {
    if (!this.currentSubscription) return 0;
    return this.subscriptionService.getUsagePercentage(
      this.currentSubscription.emailsUsed,
      this.currentSubscription.plan?.emailQuota
    );
  }

  getTransactionUsagePercentage(): number {
    if (!this.currentSubscription) return 0;
    return this.subscriptionService.getUsagePercentage(
      this.currentSubscription.transactionsUsed,
      this.currentSubscription.plan?.transactionLimit
    );
  }

  getEmailUsageText(): string {
    if (!this.currentSubscription) return '';
    return this.subscriptionService.formatUsageText(
      this.currentSubscription.emailsUsed,
      this.currentSubscription.plan?.emailQuota,
      'emails'
    );
  }

  getTransactionUsageText(): string {
    if (!this.currentSubscription) return '';
    return this.subscriptionService.formatUsageText(
      this.currentSubscription.transactionsUsed,
      this.currentSubscription.plan?.transactionLimit,
      'transactions'
    );
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  navigateToSubscriptions(): void {
    this.router.navigate(['/subscription-dashboard']);
  }

  navigateToPlans(): void {
    this.router.navigate(['/subscription-plans']);
  }
} 