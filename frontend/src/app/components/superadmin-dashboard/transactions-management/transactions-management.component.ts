import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  
  // Filter panel state
  showTransactionFilters = false;
  hasActiveTransactionFilters = false;
  
  // Pagination
  transactionCurrentPage = 1;
  transactionItemsPerPage = 10;
  itemsPerPageOptions = [10, 25, 50, 100];
  
  // Sorting
  transactionSortField: string = 'transactionDate';
  transactionSortDirection: 'asc' | 'desc' = 'desc';

  constructor(private superadminService: SuperadminService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  ngOnDestroy() {}

  async loadTransactions() {
    try {
      console.log('Loading transactions...');
      this.transactionsError = null;
      const response = await this.superadminService.getAllTransactions();
      console.log('Raw transactions response:', response);
      
      // Ensure proper amount parsing for each transaction
      this.transactions = (response || []).map(tx => {
        const parsedAmount = this.parseAmount(tx.amount);
        console.log('Processing transaction:', {
          id: tx.id,
          originalAmount: tx.amount,
          parsedAmount: parsedAmount,
          type: tx.type
        });
        return {
          ...tx,
          amount: parsedAmount
        };
      });
      
      console.log('Processed transactions:', this.transactions);
      console.log('Total Credits:', this.getTotalCredits());
      console.log('Total Debits:', this.getTotalDebits());
      console.log('Net Flow:', this.getNetFlow());
      
      if (this.transactions.length === 0) {
        console.warn('No transactions loaded from the API');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.transactionsError = 'Failed to load transactions. Please try again.';
      
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
    }
  }

  get filteredTransactions(): Transaction[] {
    let filtered = [...this.transactions];

    // Search filter
    if (this.transactionSearchTerm) {
      const searchLower = this.transactionSearchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(searchLower) ||
        tx.user.name.toLowerCase().includes(searchLower) ||
        tx.user.email.toLowerCase().includes(searchLower) ||
        tx.id.toString().includes(searchLower)
      );
    }

    // Type filter
    if (this.transactionFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === this.transactionFilter);
    }

    // User filter
    if (this.transactionUserFilter) {
      filtered = filtered.filter(tx => tx.user.email === this.transactionUserFilter);
    }

    // Date range filter
    if (this.transactionDateFromFilter) {
      const fromDate = new Date(this.transactionDateFromFilter);
      filtered = filtered.filter(tx => new Date(tx.transactionDate) >= fromDate);
    }

    if (this.transactionDateToFilter) {
      const toDate = new Date(this.transactionDateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => new Date(tx.transactionDate) <= toDate);
    }

    // Amount range filter
    if (this.transactionAmountMinFilter !== null && this.transactionAmountMinFilter >= 0) {
      filtered = filtered.filter(tx => tx.amount >= this.transactionAmountMinFilter!);
    }

    if (this.transactionAmountMaxFilter !== null && this.transactionAmountMaxFilter >= 0) {
      filtered = filtered.filter(tx => tx.amount <= this.transactionAmountMaxFilter!);
    }

    // Apply sorting
    return this.sortTransactions(filtered);
  }

  get paginatedTransactions() {
    const startIndex = (this.transactionCurrentPage - 1) * this.transactionItemsPerPage;
    const endIndex = startIndex + this.transactionItemsPerPage;
    return this.filteredTransactions.slice(startIndex, endIndex);
  }

  get transactionTotalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.transactionItemsPerPage);
  }

  // Summary calculations with proper number handling
  getTotalTransactionCount(): number {
    return this.transactions.length;
  }

  getTotalCredits(): number {
    const total = this.transactions
      .filter(tx => tx.type === 'CREDIT')
      .reduce((sum, tx) => {
        const amount = this.parseAmount(tx.amount);
        console.log('Credit transaction:', { id: tx.id, amount: tx.amount, parsed: amount });
        return sum + amount;
      }, 0);
    console.log('Total credits:', total);
    return total;
  }

  getTotalDebits(): number {
    const total = this.transactions
      .filter(tx => tx.type === 'DEBIT')
      .reduce((sum, tx) => {
        const amount = this.parseAmount(tx.amount);
        console.log('Debit transaction:', { id: tx.id, amount: tx.amount, parsed: amount });
        return sum + amount;
      }, 0);
    console.log('Total debits:', total);
    return total;
  }

  getNetFlow(): number {
    const netFlow = this.getTotalCredits() - this.getTotalDebits();
    console.log('Net flow:', netFlow);
    return netFlow;
  }

  parseAmount(amount: any): number {
    if (amount === null || amount === undefined) {
      console.log('Null/undefined amount:', amount);
      return 0;
    }
    if (typeof amount === 'number') {
      console.log('Number amount:', amount);
      return amount;
    }
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
      console.log('String amount:', { original: amount, parsed: parsed });
      return isNaN(parsed) ? 0 : parsed;
    }
    console.log('Unknown amount type:', { amount, type: typeof amount });
    return 0;
  }

  formatCurrency(amount: any): string {
    const parsedAmount = this.parseAmount(amount);
    console.log('Formatting amount:', { original: amount, parsed: parsedAmount });
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parsedAmount);
  }

  // Filter methods
  toggleTransactionFilters() {
    this.showTransactionFilters = !this.showTransactionFilters;
  }

  onTransactionSearchChange() {
    this.transactionCurrentPage = 1;
    this.updateActiveTransactionFilters();
  }

  onTransactionFilterChange() {
    this.transactionCurrentPage = 1;
    this.updateActiveTransactionFilters();
  }

  onTransactionDateChange() {
    this.transactionCurrentPage = 1;
    this.updateActiveTransactionFilters();
  }

  onTransactionAmountChange() {
    this.transactionCurrentPage = 1;
    this.updateActiveTransactionFilters();
  }

  clearAllTransactionFilters() {
    this.transactionSearchTerm = '';
    this.transactionFilter = 'all';
    this.transactionUserFilter = '';
    this.transactionDateFromFilter = '';
    this.transactionDateToFilter = '';
    this.transactionAmountMinFilter = null;
    this.transactionAmountMaxFilter = null;
    this.transactionCurrentPage = 1;
    this.updateActiveTransactionFilters();
  }

  applyTransactionFilters() {
    this.transactionCurrentPage = 1;
    this.updateActiveTransactionFilters();
  }

  updateActiveTransactionFilters() {
    this.hasActiveTransactionFilters = !!(
      this.transactionSearchTerm ||
      this.transactionFilter !== 'all' ||
      this.transactionUserFilter ||
      this.transactionDateFromFilter ||
      this.transactionDateToFilter ||
      (this.transactionAmountMinFilter !== null && this.transactionAmountMinFilter >= 0) ||
      (this.transactionAmountMaxFilter !== null && this.transactionAmountMaxFilter >= 0)
    );
  }

  getActiveTransactionFiltersCount(): number {
    let count = 0;
    if (this.transactionSearchTerm) count++;
    if (this.transactionFilter !== 'all') count++;
    if (this.transactionUserFilter) count++;
    if (this.transactionDateFromFilter) count++;
    if (this.transactionDateToFilter) count++;
    if (this.transactionAmountMinFilter !== null && this.transactionAmountMinFilter >= 0) count++;
    if (this.transactionAmountMaxFilter !== null && this.transactionAmountMaxFilter >= 0) count++;
    return count;
  }

  // Sorting methods
  sortTransactions(transactions: Transaction[]): Transaction[] {
    if (!this.transactionSortField) return transactions;

    return transactions.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.transactionSortField) {
        case 'transactionDate':
          aValue = new Date(a.transactionDate);
          bValue = new Date(b.transactionDate);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.transactionSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.transactionSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onTransactionSortChange() {
    // Sorting is applied automatically through the filteredTransactions getter
  }

  toggleTransactionSortDirection() {
    this.transactionSortDirection = this.transactionSortDirection === 'asc' ? 'desc' : 'asc';
  }

  onTransactionPageSizeChange(newSize: number) {
    // Ensure newSize is a number
    const size = parseInt(String(newSize), 10);
    if (!isNaN(size) && size > 0) {
      this.transactionItemsPerPage = size;
      this.transactionCurrentPage = 1; // Reset to first page when changing page size
      console.log('Page size changed:', {
        newSize: size,
        totalItems: this.filteredTransactions.length,
        totalPages: this.transactionTotalPages
      });
    }
  }

  // Pagination methods
  getTransactionStartIndex(): number {
    const startIndex = (this.transactionCurrentPage - 1) * this.transactionItemsPerPage;
    return Math.min(startIndex + 1, this.filteredTransactions.length);
  }

  getTransactionEndIndex(): number {
    const endIndex = this.transactionCurrentPage * this.transactionItemsPerPage;
    return Math.min(endIndex, this.filteredTransactions.length);
  }

  goToTransactionFirstPage() {
    this.transactionCurrentPage = 1;
  }

  goToTransactionLastPage() {
    this.transactionCurrentPage = this.transactionTotalPages;
  }

  goToTransactionPrevPage() {
    if (this.transactionCurrentPage > 1) {
      this.transactionCurrentPage--;
    }
  }

  goToTransactionNextPage() {
    if (this.transactionCurrentPage < this.transactionTotalPages) {
      this.transactionCurrentPage++;
    }
  }

  goToTransactionPage(page: number) {
    if (page >= 1 && page <= this.transactionTotalPages) {
      this.transactionCurrentPage = page;
    }
  }

  getTransactionVisiblePages(): number[] {
    const totalPages = this.transactionTotalPages;
    const currentPage = this.transactionCurrentPage;
    
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages: number[] = [];
    
    // Always show first page
    pages.push(1);
    
    if (currentPage > 4) {
      pages.push(-1); // Add ellipsis
    }
    
    // Calculate range around current page
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (currentPage < totalPages - 3) {
      pages.push(-1); // Add ellipsis
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
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

  // Export functionality
  exportToPDF() {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Transactions Management Report', 14, 15);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 14, 25);
    
    // Add summary statistics
    doc.setFontSize(12);
    doc.text('Summary:', 14, 35);
    doc.setFontSize(10);
    doc.text(`Total Transactions: ${this.getTotalTransactionCount()}`, 14, 42);
    doc.text(`Total Credits: ${this.formatCurrency(this.getTotalCredits())}`, 14, 49);
    doc.text(`Total Debits: ${this.formatCurrency(this.getTotalDebits())}`, 14, 56);
    doc.text(`Net Flow: ${this.formatCurrency(this.getNetFlow())}`, 14, 63);
    
    // Prepare table data
    const tableData = this.filteredTransactions.map(tx => [
      tx.id.toString(),
      tx.user.name,
      tx.user.email,
      tx.description,
      tx.type,
      this.formatCurrency(tx.amount),
      this.formatDate(tx.transactionDate)
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Transaction ID', 'User Name', 'User Email', 'Description', 'Type', 'Amount', 'Date']],
      body: tableData,
      startY: 70,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [31, 41, 55],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 40 },
        4: { cellWidth: 15 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 }
      }
    });
    
    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`transactions-${timestamp}.pdf`);
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