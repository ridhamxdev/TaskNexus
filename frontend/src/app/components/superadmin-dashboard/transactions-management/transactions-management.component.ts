import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TreeTableModule } from 'primeng/treetable';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TreeNode } from 'primeng/api';
import { TreeTable } from 'primeng/treetable';

import { SuperadminService } from '../../../services/superadmin.service';
import { TransactionService } from '../../../services/transaction.service';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Transaction {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  transactionDate: string;
  feeAmount?: number;
  feeType?: 'SEND_MONEY' | 'ADD_MONEY' | 'SUBSCRIPTION';
  isFeeTransaction?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-transactions-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    InputTextModule, 
    DropdownModule, 
    CalendarModule, 
    TableModule,
    TreeTableModule
  ],
  templateUrl: './transactions-management.component.html',
  styleUrls: ['./transactions-management.component.css']
})
export class TransactionsManagementComponent implements OnInit {
  @Input() users: User[] = [];
  @ViewChild('treeTable') treeTable!: TreeTable;
  
  transactions: TreeNode<Transaction>[] = [];
  filteredTransactions: TreeNode<Transaction>[] = [];
  flatTransactions: Transaction[] = [];
  cols: any[] = [];
  
  // Loading state
  loading = false;
  
  // Error handling
  transactionsError: string | null = null;

  // Search and filtering
  transactionSearchTerm = '';
  showFilters = false;
  transactionTypeFilter = 'all';
  amountMinFilter: number | null = null;
  amountMaxFilter: number | null = null;
  dateFromFilter: string = '';
  dateToFilter: string = '';

  // Sorting and pagination
  sortField = 'transactionDate';
  sortDirection: 'asc' | 'desc' = 'desc';
  itemsPerPage = 10;
  currentPage = 1;
  totalPages = 0;

  constructor(
    private superadminService: SuperadminService,
    private transactionService: TransactionService
  ) {
    this.cols = [
      { field: 'id', header: 'ID', width: '8rem' },
      { field: 'userName', header: 'User', width: '25rem' },
      { field: 'amount', header: 'Amount', width: '12rem' },
      { field: 'type', header: 'Type', width: '10rem' },
      { field: 'transactionDate', header: 'Date', width: '12rem' },
      { field: 'description', header: 'Description', width: '20rem' }
    ];
  }

  ngOnInit() {
    this.loadTransactions();
  }

  async loadTransactions() {
    try {
      console.log('Loading transactions...');
      this.loading = true;
      this.transactionsError = null;
      
      try {
        const { firstValueFrom } = await import('rxjs');
        const treeData = await firstValueFrom(this.transactionService.getTransactionsWithFees());
        console.log('Tree data response:', treeData);
        
        // Convert to TreeNode format for PrimeNG TreeTable
        this.transactions = treeData.map((node: any, index: number) => {
          const nodeKey = `tx_${node.data.id}`;
          const treeNode: TreeNode<Transaction> = {
            key: nodeKey,
            data: {
              id: node.data.id,
              userId: node.data.userId,
              userName: node.data.userName,
              userEmail: node.data.userEmail,
              amount: Number(node.data.amount),
              type: node.data.type,
              description: node.data.description,
              transactionDate: node.data.transactionDate,
              feeAmount: node.data.feeAmount ? Number(node.data.feeAmount) : undefined,
              feeType: node.data.feeType,
              isFeeTransaction: node.data.isFeeTransaction || false,
              createdAt: node.data.createdAt,
              updatedAt: node.data.updatedAt
            },
            children: node.children?.map((child: any, childIndex: number) => ({
              key: `${nodeKey}_fee_${child.data.id}`,
              data: {
                id: child.data.id,
                userId: child.data.userId,
                userName: child.data.userName,
                userEmail: child.data.userEmail,
                amount: Number(child.data.amount),
                type: child.data.type,
                description: child.data.description,
                transactionDate: child.data.transactionDate,
                feeAmount: child.data.feeAmount ? Number(child.data.feeAmount) : undefined,
                feeType: child.data.feeType,
                isFeeTransaction: true,
                createdAt: child.data.createdAt,
                updatedAt: child.data.updatedAt
              }
            })) || []
          };
          
          return treeNode;
        });

        // Also create flat list for statistics
        this.flatTransactions = [];
        this.transactions.forEach(treeNode => {
          if (treeNode.data) {
            this.flatTransactions.push(treeNode.data);
            if (treeNode.children) {
              treeNode.children.forEach(child => {
                if (child.data) {
                  this.flatTransactions.push(child.data);
                }
              });
            }
          }
        });

        // Apply initial filtering and sorting
        this.applyFiltersAndSort();

        console.log('Processed transactions as tree nodes:', this.transactions);
        console.log('Flat transactions for stats:', this.flatTransactions);
      } catch (error) {
        console.error('Failed to load transactions:', error);
        this.transactionsError = 'Failed to load transactions. Please try again.';
        this.transactions = [];
        this.filteredTransactions = [];
        this.flatTransactions = [];
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.transactionsError = 'Failed to load transactions. Please try again.';
      this.transactions = [];
      this.filteredTransactions = [];
      this.flatTransactions = [];
    } finally {
      this.loading = false;
    }
  }

  // Search and Filter Methods
  onSearchChange() {
    this.applyFiltersAndSort();
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  onFilterChange() {
    this.applyFiltersAndSort();
  }

  onPageSizeChange(newSize: number) {
    this.itemsPerPage = newSize;
    this.currentPage = 1; // Reset to first page when changing page size
    this.updatePagination();
  }

  applyFilters() {
    this.applyFiltersAndSort();
  }

  clearAllFilters() {
    this.transactionSearchTerm = '';
    this.transactionTypeFilter = 'all';
    this.amountMinFilter = null;
    this.amountMaxFilter = null;
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.currentPage = 1; // Reset to first page when clearing filters
    this.applyFiltersAndSort();
  }

  private applyFiltersAndSort() {
    let filtered = [...this.transactions];

    // Apply search filter
    if (this.transactionSearchTerm) {
      const searchTerm = this.transactionSearchTerm.toLowerCase();
      filtered = filtered.filter(node => {
        if (!node.data) return false;
        return (
          node.data.id.toString().includes(searchTerm) ||
          node.data.userName?.toLowerCase().includes(searchTerm) ||
          node.data.userEmail?.toLowerCase().includes(searchTerm) ||
          node.data.description?.toLowerCase().includes(searchTerm)
        );
      });
    }

    // Apply type filter
    if (this.transactionTypeFilter !== 'all') {
      if (this.transactionTypeFilter === 'fee') {
        filtered = filtered.filter(node => 
          node.children && node.children.length > 0
        );
      } else if (this.transactionTypeFilter === 'main') {
        filtered = filtered.map(node => ({
          ...node,
          children: []
        }));
      } else {
        filtered = filtered.filter(node => 
          node.data?.type === this.transactionTypeFilter
        );
      }
    }

    // Apply amount range filter
    if (this.amountMinFilter !== null || this.amountMaxFilter !== null) {
      filtered = filtered.filter(node => {
        if (!node.data) return false;
        const amount = node.data.amount;
        const minValid = this.amountMinFilter === null || amount >= this.amountMinFilter;
        const maxValid = this.amountMaxFilter === null || amount <= this.amountMaxFilter;
        return minValid && maxValid;
      });
    }

    // Apply date range filter
    if (this.dateFromFilter || this.dateToFilter) {
      filtered = filtered.filter(node => {
        if (!node.data?.transactionDate) return false;
        const transactionDate = new Date(node.data.transactionDate);
        const fromValid = !this.dateFromFilter || transactionDate >= new Date(this.dateFromFilter);
        const toValid = !this.dateToFilter || transactionDate <= new Date(this.dateToFilter + 'T23:59:59');
        return fromValid && toValid;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (!a.data || !b.data) return 0;
      
      let aValue: any = a.data[this.sortField as keyof Transaction];
      let bValue: any = b.data[this.sortField as keyof Transaction];

      if (this.sortField === 'transactionDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.filteredTransactions = filtered;
    this.updatePagination();
  }

  private updatePagination() {
    this.totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  // Sorting Methods
  onSortChange() {
    this.applyFiltersAndSort();
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.applyFiltersAndSort();
  }

  // Tree Control Methods
  expandAll() {
    this.filteredTransactions.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.expanded = true;
      }
    });
  }

  collapseAll() {
    this.filteredTransactions.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.expanded = false;
      }
    });
  }

  // Export Methods
  exportToPDF() {
    // Implementation for PDF export
    console.log('Exporting transactions to PDF...');
    // You can implement PDF export logic here using libraries like jsPDF
    alert('PDF export functionality will be implemented.');
  }

  // Action Methods
  viewTransactionDetails(transactionId: number) {
    console.log('Viewing transaction details for ID:', transactionId);
    // Navigate to transaction details or open modal
    alert(`View transaction details for ID: ${transactionId}`);
  }

  viewUserDetails(userId: number) {
    console.log('Viewing user details for ID:', userId);
    // Navigate to user details or open modal
    alert(`View user details for ID: ${userId}`);
  }

  // Filter Status Methods
  get hasActiveFilters(): boolean {
    return !!(
      this.transactionSearchTerm ||
      this.transactionTypeFilter !== 'all' ||
      this.amountMinFilter !== null ||
      this.amountMaxFilter !== null ||
      this.dateFromFilter ||
      this.dateToFilter
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.transactionSearchTerm) count++;
    if (this.transactionTypeFilter !== 'all') count++;
    if (this.amountMinFilter !== null || this.amountMaxFilter !== null) count++;
    if (this.dateFromFilter || this.dateToFilter) count++;
    return count;
  }

  // Pagination Info Methods
  getStartIndex(): number {
    return this.filteredTransactions.length > 0 ? (this.currentPage - 1) * this.itemsPerPage : 0;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredTransactions.length);
  }

  getTotalRecords(): number {
    return this.filteredTransactions.length;
  }

  // Paginated data getter
  get paginatedTransactions(): TreeNode<Transaction>[] {
    const startIndex = this.getStartIndex();
    const endIndex = this.getEndIndex();
    return this.filteredTransactions.slice(startIndex, endIndex);
  }

  // Pagination Navigation Methods
  goToFirstPage() {
    this.currentPage = 1;
  }

  goToPrevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToLastPage() {
    this.currentPage = this.totalPages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // Helper method to format currency
  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace('₹', '₹ '); // Add space after symbol
  }

  // Helper method to format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Helper method to get fee type label
  getFeeTypeLabel(feeType?: string): string {
    if (!feeType) return 'Transaction Fee';
    
    switch (feeType) {
      case 'SEND_MONEY':
        return 'Send Money Fee';
      case 'ADD_MONEY':
        return 'Add Money Fee';
      case 'SUBSCRIPTION':
        return 'Subscription Fee';
      default:
        return 'Transaction Fee';
    }
  }

  // Get total transactions count (excluding fees)
  getTotalTransactionCount(): number {
    return this.flatTransactions.filter(tx => !tx.isFeeTransaction).length;
  }

  // Get total credits
  getTotalCredits(): number {
    return this.flatTransactions
      .filter(tx => tx.type === 'CREDIT' && !tx.isFeeTransaction)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  // Get total debits
  getTotalDebits(): number {
    return this.flatTransactions
      .filter(tx => tx.type === 'DEBIT' && !tx.isFeeTransaction)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  // Get net flow
  getNetFlow(): number {
    return this.getTotalCredits() - this.getTotalDebits();
  }

  // Refresh functionality
  refreshTransactions(): void {
    this.loadTransactions();
  }

  // Statistics calculations (excluding fee transactions to avoid double counting)
  getMainTransactions(): Transaction[] {
    return this.flatTransactions.filter(tx => !tx.isFeeTransaction);
  }

  getFeeTransactions(): Transaction[] {
    return this.flatTransactions.filter(tx => tx.isFeeTransaction);
  }

  // Fee-specific statistics
  getTotalFeeCredits(): number {
    return this.flatTransactions
      .filter(tx => tx.type === 'CREDIT' && tx.isFeeTransaction)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  getTotalFeeDebits(): number {
    return this.flatTransactions
      .filter(tx => tx.type === 'DEBIT' && tx.isFeeTransaction)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  getTotalFeeTransactionCount(): number {
    return this.flatTransactions.filter(tx => tx.isFeeTransaction).length;
  }
} 