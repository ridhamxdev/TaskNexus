import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  balance: number;
  role: string;
  createdAt: string;
  status: 'Active' | 'Inactive';
}

interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  transactionDate: string;
  user: {
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-transactions-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions-management.component.html',
  styleUrls: ['./transactions-management.component.css']
})
export class TransactionsManagementComponent implements OnInit, OnDestroy {
  @Input() users: User[] = [];
  
  transactions: Transaction[] = [];
  
  // Error handling
  transactionsError: string | null = null;
  
  // Filtering and search
  transactionFilter = 'all';
  transactionUserFilter = '';
  transactionSearchTerm = '';
  transactionDateFromFilter = '';
  transactionDateToFilter = '';
  transactionAmountMinFilter: number | null = null;
  transactionAmountMaxFilter: number | null = null;
  
  // Dropdown states
  showTransactionFilters = false;
  showTransactionUserDropdown = false;
  hasActiveTransactionFilters = false;
  
  // Selected items
  selectedTransactionUser: {name: string, email: string} | null = null;
  
  // Pagination
  transactionCurrentPage = 1;
  transactionItemsPerPage = 10;
  transactionPageSizes = [5, 10, 25, 50, 100];
  
  // Sorting
  transactionSortField: string = '';
  transactionSortDirection: 'asc' | 'desc' = 'asc';

  constructor(private superadminService: SuperadminService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  ngOnDestroy() {}

  async loadTransactions() {
    try {
      this.transactionsError = null;
      const response = await this.superadminService.getAllTransactions();
      this.transactions = response || [];
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.transactionsError = 'Failed to load transactions. Please try again.';
    }
  }

  get filteredTransactions() {
    let filtered = [...this.transactions];

    // Apply search filter
    if (this.transactionSearchTerm) {
      const searchTerm = this.transactionSearchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.user.name.toLowerCase().includes(searchTerm) ||
        transaction.user.email.toLowerCase().includes(searchTerm) ||
        transaction.description.toLowerCase().includes(searchTerm) ||
        transaction.id.toString().includes(searchTerm)
      );
    }

    // Apply type filter
    if (this.transactionFilter && this.transactionFilter !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === this.transactionFilter);
    }

    // Apply user filter
    if (this.selectedTransactionUser) {
      filtered = filtered.filter(transaction => 
        transaction.user.email === this.selectedTransactionUser!.email
      );
    }

    // Apply date range filter
    if (this.transactionDateFromFilter) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.transactionDate) >= new Date(this.transactionDateFromFilter)
      );
    }
    if (this.transactionDateToFilter) {
      filtered = filtered.filter(transaction => 
        new Date(transaction.transactionDate) <= new Date(this.transactionDateToFilter)
      );
    }

    // Apply amount range filter
    if (this.transactionAmountMinFilter !== null) {
      filtered = filtered.filter(transaction => 
        transaction.amount >= this.transactionAmountMinFilter!
      );
    }
    if (this.transactionAmountMaxFilter !== null) {
      filtered = filtered.filter(transaction => 
        transaction.amount <= this.transactionAmountMaxFilter!
      );
    }

    return filtered;
  }

  get paginatedTransactions() {
    const startIndex = (this.transactionCurrentPage - 1) * this.transactionItemsPerPage;
    const endIndex = startIndex + this.transactionItemsPerPage;
    return this.filteredTransactions.slice(startIndex, endIndex);
  }

  get transactionTotalPages() {
    return Math.ceil(this.filteredTransactions.length / this.transactionItemsPerPage);
  }

  get transactionPaginationInfo() {
    const startItem = (this.transactionCurrentPage - 1) * this.transactionItemsPerPage + 1;
    const endItem = Math.min(this.transactionCurrentPage * this.transactionItemsPerPage, this.filteredTransactions.length);
    const totalItems = this.filteredTransactions.length;
    return `Showing ${startItem}-${endItem} of ${totalItems} transactions`;
  }

  clearTransactionFilters() {
    this.transactionFilter = 'all';
    this.transactionUserFilter = '';
    this.transactionSearchTerm = '';
    this.transactionDateFromFilter = '';
    this.transactionDateToFilter = '';
    this.transactionAmountMinFilter = null;
    this.transactionAmountMaxFilter = null;
    this.selectedTransactionUser = null;
    this.transactionCurrentPage = 1;
  }

  toggleTransactionUserDropdown() {
    this.showTransactionUserDropdown = !this.showTransactionUserDropdown;
  }

  selectTransactionUser(user: {name: string, email: string} | null) {
    this.selectedTransactionUser = user;
    this.transactionUserFilter = user ? user.email : '';
    this.showTransactionUserDropdown = false;
    this.transactionCurrentPage = 1;
  }

  removeTransactionUserFilter() {
    this.selectedTransactionUser = null;
    this.transactionUserFilter = '';
  }

  filterTransactionsByType(type: string) {
    this.transactionFilter = type;
    this.transactionCurrentPage = 1;
  }

  filterTransactionsByDateRange(range: string) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (range) {
      case 'today':
        this.transactionDateFromFilter = todayStr;
        this.transactionDateToFilter = todayStr;
        break;
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        this.transactionDateFromFilter = weekStart.toISOString().split('T')[0];
        this.transactionDateToFilter = todayStr;
        break;
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        this.transactionDateFromFilter = monthStart.toISOString().split('T')[0];
        this.transactionDateToFilter = todayStr;
        break;
      case 'last-30-days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        this.transactionDateFromFilter = thirtyDaysAgo.toISOString().split('T')[0];
        this.transactionDateToFilter = todayStr;
        break;
      default:
        this.transactionDateFromFilter = '';
        this.transactionDateToFilter = '';
        break;
    }
    this.transactionCurrentPage = 1;
  }

  get transactionUsers() {
    const userMap = new Map();
    this.transactions.forEach(transaction => {
      const user = transaction.user;
      if (!userMap.has(user.email)) {
        userMap.set(user.email, {
          name: user.name,
          email: user.email
        });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  goToTransactionPage(page: number) {
    if (page >= 1 && page <= this.transactionTotalPages) {
      this.transactionCurrentPage = page;
    }
  }

  nextTransactionPage() {
    if (this.transactionCurrentPage < this.transactionTotalPages) {
      this.transactionCurrentPage++;
    }
  }

  previousTransactionPage() {
    if (this.transactionCurrentPage > 1) {
      this.transactionCurrentPage--;
    }
  }

  changeTransactionPageSize(newSize: number) {
    this.transactionItemsPerPage = newSize;
    this.transactionCurrentPage = 1;
  }

  toggleTransactionFilters() {
    this.showTransactionFilters = !this.showTransactionFilters;
  }

  onTransactionSearchChange() {
    this.transactionCurrentPage = 1;
  }

  onTransactionFilterChange() {
    this.transactionCurrentPage = 1;
  }

  onTransactionDateChange() {
    this.transactionCurrentPage = 1;
  }

  onTransactionAmountChange() {
    this.transactionCurrentPage = 1;
  }

  formatCurrency(amount: number): string {
    if (amount == null || isNaN(amount)) {
      return '₹0.00';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  getTransactionColor(type: string): string {
    return type === 'CREDIT' ? 'text-green-400' : 'text-red-400';
  }

  getTransactionIcon(type: string): string {
    return type === 'CREDIT' ? 'pi-plus' : 'pi-minus';
  }

  getTransactionCountForUser(email: string): string {
    const count = this.transactions.filter(t => t.user.email === email).length;
    return `${count} transaction${count !== 1 ? 's' : ''}`;
  }
} 