import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService, Transaction } from '../../services/transaction.service';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.css']
})
export class TransactionListComponent implements OnInit {
  transactions: Transaction[] = [];
  loading = false;
  error = '';

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  pageSizes = [5, 10, 15, 25, 50];

  // Sorting properties
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Filter properties
  searchTerm: string = '';
  typeFilter: string = 'all'; // 'all', 'CREDIT', 'DEBIT'
  userFilter: string = '';
  dateFromFilter: string = '';
  dateToFilter: string = '';
  amountMinFilter: number | null = null;
  amountMaxFilter: number | null = null;

  // Filter state
  showFilters: boolean = false;
  hasActiveFilters: boolean = false;

  constructor(private transactionService: TransactionService) {}

  ngOnInit() {
    this.fetchTransactions();
  }

  fetchTransactions() {
    this.loading = true;
    this.error = '';
    
    this.transactionService.getAllTransactions().subscribe({
      next: (data) => {
        this.transactions = data;
        this.loading = false;
        this.updateActiveFiltersState();
      },
      error: (err) => {
        this.error = 'Failed to load transactions';
        this.loading = false;
      }
    });
  }

  // Filter methods
  get filteredTransactions() {
    let filtered = [...this.transactions];

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        t.id.toString().includes(searchLower) ||
        t.amount.toString().includes(searchLower) ||
        (t.user?.name && t.user.name.toLowerCase().includes(searchLower)) ||
        (t.user?.email && t.user.email.toLowerCase().includes(searchLower))
      );
    }

    // Type filter
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === this.typeFilter);
    }

    // User filter
    if (this.userFilter) {
      const userLower = this.userFilter.toLowerCase();
      filtered = filtered.filter(t =>
        (t.user?.name && t.user.name.toLowerCase().includes(userLower)) ||
        (t.user?.email && t.user.email.toLowerCase().includes(userLower))
      );
    }

    // Date range filter
    if (this.dateFromFilter) {
      const fromDate = new Date(this.dateFromFilter);
      filtered = filtered.filter(t => new Date(t.transactionDate) >= fromDate);
    }

    if (this.dateToFilter) {
      const toDate = new Date(this.dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.transactionDate) <= toDate);
    }

    // Amount range filter
    if (this.amountMinFilter !== null && this.amountMinFilter > 0) {
      filtered = filtered.filter(t => t.amount >= this.amountMinFilter!);
    }

    if (this.amountMaxFilter !== null && this.amountMaxFilter > 0) {
      filtered = filtered.filter(t => t.amount <= this.amountMaxFilter!);
    }

    return filtered;
  }

  // Clear all filters
  clearAllFilters() {
    this.searchTerm = '';
    this.typeFilter = 'all';
    this.userFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.amountMinFilter = null;
    this.amountMaxFilter = null;
    this.currentPage = 1;
    this.updateActiveFiltersState();
  }

  // Toggle filters panel
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  // Update active filters state
  updateActiveFiltersState() {
    this.hasActiveFilters = !!(
      this.searchTerm || 
      this.typeFilter !== 'all' || 
      this.userFilter ||
      this.dateFromFilter || 
      this.dateToFilter || 
      this.amountMinFilter || 
      this.amountMaxFilter
    );
  }

  // Apply filters
  applyFilters() {
    this.currentPage = 1;
    this.updateActiveFiltersState();
  }

  // Quick filter methods
  filterByType(type: string) {
    this.typeFilter = type;
    this.applyFilters();
  }

  filterByDateRange(range: string) {
    const today = new Date();
    let fromDate: Date;

    switch (range) {
      case 'today':
        fromDate = new Date(today);
        this.dateFromFilter = fromDate.toISOString().split('T')[0];
        this.dateToFilter = today.toISOString().split('T')[0];
        break;
      case 'week':
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 7);
        this.dateFromFilter = fromDate.toISOString().split('T')[0];
        this.dateToFilter = '';
        break;
      case 'month':
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 1);
        this.dateFromFilter = fromDate.toISOString().split('T')[0];
        this.dateToFilter = '';
        break;
      default:
        this.dateFromFilter = '';
        this.dateToFilter = '';
    }
    this.applyFilters();
  }

  // Pagination methods
  get paginatedTransactions() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.sortedTransactions.slice(startIndex, endIndex);
  }

  get totalPages() {
    return Math.ceil(this.sortedTransactions.length / this.itemsPerPage);
  }

  get paginationInfo() {
    const total = this.sortedTransactions.length;
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
    this.currentPage = 1;
  }

  // Sorting methods
  sortTransactions(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'pi-sort';
    return this.sortDirection === 'asc' ? 'pi-sort-up' : 'pi-sort-down';
  }

  get sortedTransactions() {
    if (!this.sortField) {
      return [...this.filteredTransactions].sort((a, b) => {
        return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      });
    }

    return [...this.filteredTransactions].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.sortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'user':
          valueA = (a.user?.name || '').toLowerCase();
          valueB = (b.user?.name || '').toLowerCase();
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'type':
          valueA = a.type;
          valueB = b.type;
          break;
        case 'description':
          valueA = a.description.toLowerCase();
          valueB = b.description.toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.transactionDate);
          valueB = new Date(b.transactionDate);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Helper methods
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.typeFilter !== 'all') count++;
    if (this.userFilter) count++;
    if (this.dateFromFilter) count++;
    if (this.dateToFilter) count++;
    if (this.amountMinFilter) count++;
    if (this.amountMaxFilter) count++;
    return count;
  }

  getFilterSummary(): string {
    const filters: string[] = [];
    
    if (this.searchTerm) filters.push(`Search: "${this.searchTerm}"`);
    if (this.typeFilter !== 'all') filters.push(`Type: ${this.typeFilter}`);
    if (this.userFilter) filters.push(`User: "${this.userFilter}"`);
    if (this.dateFromFilter || this.dateToFilter) {
      const dateRange = [];
      if (this.dateFromFilter) dateRange.push(`From: ${this.dateFromFilter}`);
      if (this.dateToFilter) dateRange.push(`To: ${this.dateToFilter}`);
      filters.push(`Date: ${dateRange.join(', ')}`);
    }
    if (this.amountMinFilter || this.amountMaxFilter) {
      const amountRange = [];
      if (this.amountMinFilter) amountRange.push(`Min: ₹${this.amountMinFilter}`);
      if (this.amountMaxFilter) amountRange.push(`Max: ₹${this.amountMaxFilter}`);
      filters.push(`Amount: ${amountRange.join(', ')}`);
    }

    return filters.join(' | ');
  }
} 