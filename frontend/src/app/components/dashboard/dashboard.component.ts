import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TransactionService, Transaction } from '../../services/transaction.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentTime: string = '';
  
  // Add Money functionality
  showAddMoney: boolean = false;
  addMoneyAmount: number | null = null;
  isAddingMoney: boolean = false;
  addMoneyError: string = '';
  addMoneySuccess: string = '';

  // Recent Transactions
  recentTransactions: Transaction[] = [];
  isLoadingTransactions: boolean = false;
  transactionError: string = '';

  constructor(
    public auth: AuthService, 
    private router: Router,
    private transactionService: TransactionService
  ) {
    this.updateTime();
    // Update time every second
    setInterval(() => this.updateTime(), 1000);
  }

  ngOnInit(): void {
    this.loadRecentTransactions();
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
} 