import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { AuthService } from '../../services/auth.service';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-user-transactions',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    MessageModule
  ],
  templateUrl: './user-transactions.component.html',
  styleUrls: ['./user-transactions.component.css']
})
export class UserTransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  isLoading = true;
  error: string | null = null;
  Math = Math; // Expose Math object to template

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  pageSizes = [5, 10, 25, 50];

  constructor(
    private transactionService: TransactionService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadUserTransactions();
  }

  // Pagination methods
  get paginatedTransactions() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.transactions.slice(startIndex, endIndex);
  }

  get totalPages() {
    return Math.ceil(this.transactions.length / this.itemsPerPage);
  }

  get paginationInfo() {
    const total = this.transactions.length;
    const start = Math.min(((this.currentPage - 1) * this.itemsPerPage) + 1, total);
    const end = Math.min(this.currentPage * this.itemsPerPage, total);
    return { start, end, total };
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  changePageSize(newSize: number) {
    this.itemsPerPage = newSize;
    this.currentPage = 1; // Reset to first page
  }

  get pageNumbers() {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const delta = 2; // Number of pages to show on each side of current page
    
    const pages: number[] = [];
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
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