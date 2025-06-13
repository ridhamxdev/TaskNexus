import { Component, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-transactions',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './user-transactions.component.html',
  styleUrls: ['./user-transactions.component.css']
})
export class UserTransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private transactionService: TransactionService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadUserTransactions();
  }

  private loadUserTransactions(): void {
    // Check if user is logged in first
    if (!this.authService.isLoggedIn()) {
      this.error = 'Please log in to view your transactions.';
      this.isLoading = false;
      return;
    }

    const user = this.authService.getUser();
    
    if (user && user.id) {
      // User data is available, load transactions directly
      this.fetchTransactionsForUser(user.id.toString());
    } else {
      // User data not available, fetch profile first
      this.fetchUserProfile();
    }
  }

  private fetchTransactionsForUser(userId: string): void {
    this.transactionService.getTransactionsForUser(userId).subscribe({
      next: (data) => {
        this.transactions = data;
        this.isLoading = false;
        
        if (data.length === 0) {
          this.error = 'No transactions found for your account.';
        }
      },
      error: (err) => {
        this.error = 'Failed to load your transactions. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  private fetchUserProfile(): void {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.authService.setUser(profile);
        this.fetchTransactionsForUser(profile.id.toString());
      },
      error: (err) => {
        this.error = 'Could not identify user. Please log in again.';
        this.isLoading = false;
      }
    });
  }
} 