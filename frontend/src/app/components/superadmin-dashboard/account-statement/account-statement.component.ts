import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  selector: 'app-account-statement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-statement.component.html',
  styleUrls: ['./account-statement.component.css']
})
export class AccountStatementComponent {
  @Input() transactions: Transaction[] = [];

  // Search and filters
  searchTerm = '';
  typeFilter = 'all';
  dateFromFilter = '';
  dateToFilter = '';
  amountMinFilter: number | null = null;
  amountMaxFilter: number | null = null;

  // Filter panel state
  showFilters = false;
  hasActiveFilters = false;

  // Pagination
  currentPage = 1;
  itemsPerPage = 25;

  // Sorting
  sortField: string = 'transactionDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(public auth: AuthService) {}

  get myTransactions(): Transaction[] {
    const myId = this.auth.getUser()?.id;
    if (!myId || !this.transactions) {
      return [];
    }
    return this.transactions.filter(tx => tx.userId === myId);
  }

  get filteredTransactions(): Transaction[] {
    let filtered = [...this.myTransactions];

    // Search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description.toLowerCase().includes(searchLower) ||
        tx.id.toString().includes(searchLower)
      );
    }

    // Type filter
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === this.typeFilter);
    }

    // Date range filter
    if (this.dateFromFilter) {
      const fromDate = new Date(this.dateFromFilter);
      filtered = filtered.filter(tx => new Date(tx.transactionDate) >= fromDate);
    }

    if (this.dateToFilter) {
      const toDate = new Date(this.dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => new Date(tx.transactionDate) <= toDate);
    }

    // Amount range filter
    if (this.amountMinFilter !== null && this.amountMinFilter >= 0) {
      filtered = filtered.filter(tx => tx.amount >= this.amountMinFilter!);
    }

    if (this.amountMaxFilter !== null && this.amountMaxFilter >= 0) {
      filtered = filtered.filter(tx => tx.amount <= this.amountMaxFilter!);
    }

    // Apply sorting
    return this.sortTransactions(filtered);
  }

  get paginatedTransactions(): Transaction[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredTransactions.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
  }

  // Summary calculations
  getTotalBalance(): number {
    const credits = this.getTotalCredits();
    const debits = this.getTotalDebits();
    return credits - debits;
  }

  getTotalCredits(): number {
    return this.myTransactions
      .filter(tx => tx.type === 'CREDIT')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  getTotalDebits(): number {
    return this.myTransactions
      .filter(tx => tx.type === 'DEBIT')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  getTotalTransactionCount(): number {
    return this.myTransactions.length;
  }

  // Filter methods
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  onSearchChange() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  onFilterChange() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  onDateChange() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  onAmountChange() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  clearAllFilters() {
    this.searchTerm = '';
    this.typeFilter = 'all';
    this.dateFromFilter = '';
    this.dateToFilter = '';
    this.amountMinFilter = null;
    this.amountMaxFilter = null;
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  applyFilters() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  updateActiveFilters() {
    this.hasActiveFilters = !!(
      this.searchTerm ||
      this.typeFilter !== 'all' ||
      this.dateFromFilter ||
      this.dateToFilter ||
      (this.amountMinFilter !== null && this.amountMinFilter >= 0) ||
      (this.amountMaxFilter !== null && this.amountMaxFilter >= 0)
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.typeFilter !== 'all') count++;
    if (this.dateFromFilter) count++;
    if (this.dateToFilter) count++;
    if (this.amountMinFilter !== null && this.amountMinFilter >= 0) count++;
    if (this.amountMaxFilter !== null && this.amountMaxFilter >= 0) count++;
    return count;
  }

  // Pagination methods
  onPageSizeChange() {
    this.currentPage = 1;
  }

  goToPage(page: number) {
    this.currentPage = page;
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

  goToFirstPage() {
    this.currentPage = 1;
  }

  goToLastPage() {
    this.currentPage = this.totalPages;
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

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  getEndIndex(): number {
    return Math.min(this.getStartIndex() + this.itemsPerPage, this.filteredTransactions.length);
  }

  // Sorting methods
  onSortChange() {
    // Reset to first page when sorting changes
    this.currentPage = 1;
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.currentPage = 1;
  }

  sortTransactions(transactions: Transaction[]): Transaction[] {
    if (!this.sortField) {
      return transactions;
    }

    return [...transactions].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.sortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'amount':
          valueA = a.amount;
          valueB = b.amount;
          break;
        case 'type':
          valueA = a.type;
          valueB = b.type;
          break;
        case 'transactionDate':
          valueA = new Date(a.transactionDate);
          valueB = new Date(b.transactionDate);
          break;
        case 'description':
          valueA = a.description.toLowerCase();
          valueB = b.description.toLowerCase();
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

  // Export functionality
  exportToPDF() {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Account Statement Report', 14, 15);
    
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
    doc.text(`Total Balance: ${this.formatCurrency(this.getTotalBalance())}`, 14, 42);
    doc.text(`Total Credits: ${this.formatCurrency(this.getTotalCredits())}`, 14, 49);
    doc.text(`Total Debits: ${this.formatCurrency(this.getTotalDebits())}`, 14, 56);
    doc.text(`Transaction Count: ${this.getTransactionCount()}`, 14, 63);
    
    // Prepare table data
    const tableData = this.filteredTransactions.map(tx => [
      tx.id.toString(),
      tx.user?.name || 'N/A',
      tx.description,
      tx.type,
      this.formatCurrency(tx.amount),
      this.formatDate(tx.transactionDate)
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Transaction ID', 'User', 'Description', 'Type', 'Amount', 'Date']],
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
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 }
      }
    });
    
    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`account-statement-${timestamp}.pdf`);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return '$' + amount.toLocaleString('en-US');
  }

  getTransactionCount(): number {
    return this.filteredTransactions.length;
  }
} 