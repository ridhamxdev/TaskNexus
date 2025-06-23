import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EmailService, SentEmail } from '../../services/email.service';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-email-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ProgressSpinnerModule,
    MessageModule,
    DialogModule,
    TooltipModule
  ],
  templateUrl: './email-list.component.html',
  styleUrls: ['./email-list.component.css']
})
export class EmailListComponent implements OnInit {
  sentEmails: SentEmail[] = [];
  isLoading = false;
  error: string | null = null;
  showEmailDialog = false;
  selectedEmail: SentEmail | null = null;
  Math = Math; // Expose Math object to template

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  pageSizes = [5, 10, 15, 25, 50];

  // Sorting properties
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'desc'; // Default to desc for most recent first

  // Filter properties
  searchTerm: string = '';
  statusFilter: string = 'all'; // 'all', 'SENT', 'PENDING', 'FAILED'
  recipientFilter: string = '';
  subjectFilter: string = '';
  dateFromFilter: string = '';
  dateToFilter: string = '';

  // Filter state
  showFilters: boolean = false;
  hasActiveFilters: boolean = false;

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    this.loadSentEmails();
  }

  loadSentEmails() {
    this.isLoading = true;
    this.error = null;

    this.emailService.getSentEmails().subscribe({
      next: (emails) => {
        this.sentEmails = emails;
        this.isLoading = false;
        this.updateActiveFiltersState();
      },
      error: (error) => {
        console.error('Error loading sent emails:', error);
        this.error = 'Failed to load sent emails. Please try again.';
        this.isLoading = false;
      }
    });
  }

  // Filter methods
  get filteredEmails() {
    let filtered = [...this.sentEmails];

    // Search filter (searches across recipient, subject, and body)
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(email =>
        email.recipient.toLowerCase().includes(searchLower) ||
        email.subject.toLowerCase().includes(searchLower) ||
        (email.body && email.body.toLowerCase().includes(searchLower)) ||
        email.id.toString().includes(searchLower)
      );
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(email => email.status === this.statusFilter);
    }

    // Recipient filter
    if (this.recipientFilter) {
      const recipientLower = this.recipientFilter.toLowerCase();
      filtered = filtered.filter(email =>
        email.recipient.toLowerCase().includes(recipientLower)
      );
    }

    // Subject filter
    if (this.subjectFilter) {
      const subjectLower = this.subjectFilter.toLowerCase();
      filtered = filtered.filter(email =>
        email.subject.toLowerCase().includes(subjectLower)
      );
    }

    // Date range filter
    if (this.dateFromFilter) {
      const fromDate = new Date(this.dateFromFilter);
      filtered = filtered.filter(email => new Date(email.sentAt) >= fromDate);
    }

    if (this.dateToFilter) {
      const toDate = new Date(this.dateToFilter);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter(email => new Date(email.sentAt) <= toDate);
    }

    return filtered;
  }

  // Clear all filters
  clearAllFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.recipientFilter = '';
    this.subjectFilter = '';
    this.dateFromFilter = '';
    this.dateToFilter = '';
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
      this.statusFilter !== 'all' || 
      this.recipientFilter ||
      this.subjectFilter ||
      this.dateFromFilter || 
      this.dateToFilter
    );
  }

  // Apply filters (called when filter values change)
  applyFilters() {
    this.currentPage = 1; // Reset to first page
    this.updateActiveFiltersState();
  }

  // Quick filter methods
  filterByStatus(status: string) {
    this.statusFilter = status;
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
      case 'year':
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - 1);
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
  get paginatedEmails() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.sortedEmails.slice(startIndex, endIndex);
  }

  get totalPages() {
    return Math.ceil(this.sortedEmails.length / this.itemsPerPage);
  }

  get paginationInfo() {
    const total = this.sortedEmails.length;
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

  viewEmailDetails(email: SentEmail) {
    this.selectedEmail = email;
    this.showEmailDialog = true;
  }

  closeEmailDialog() {
    this.showEmailDialog = false;
    this.selectedEmail = null;
  }

  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return 'Sent';
      case 'PENDING':
        return 'Pending';
      case 'FAILED':
        return 'Failed';
      default:
        return status || 'Unknown';
    }
  }

  getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'danger';
      default:
        return 'info';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return 'pi-check';
      case 'PENDING':
        return 'pi-clock';
      case 'FAILED':
        return 'pi-times';
      default:
        return 'pi-question';
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'SENT':
        return 'sent';
      case 'PENDING':
        return 'pending';
      case 'FAILED':
        return 'failed';
      default:
        return 'unknown';
    }
  }

  // Sorting methods
  sortEmails(field: string) {
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

  get sortedEmails() {
    if (!this.sortField) {
      // Default sort by date (most recent first)
      return [...this.filteredEmails].sort((a, b) => {
        return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
      });
    }

    return [...this.filteredEmails].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.sortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'recipient':
          valueA = a.recipient.toLowerCase();
          valueB = b.recipient.toLowerCase();
          break;
        case 'subject':
          valueA = a.subject.toLowerCase();
          valueB = b.subject.toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.sentAt);
          valueB = new Date(b.sentAt);
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
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
    if (this.statusFilter !== 'all') count++;
    if (this.recipientFilter) count++;
    if (this.subjectFilter) count++;
    if (this.dateFromFilter) count++;
    if (this.dateToFilter) count++;
    return count;
  }

  getFilterSummary(): string {
    const filters: string[] = [];
    
    if (this.searchTerm) filters.push(`Search: "${this.searchTerm}"`);
    if (this.statusFilter !== 'all') filters.push(`Status: ${this.statusFilter}`);
    if (this.recipientFilter) filters.push(`Recipient: "${this.recipientFilter}"`);
    if (this.subjectFilter) filters.push(`Subject: "${this.subjectFilter}"`);
    if (this.dateFromFilter || this.dateToFilter) {
      const dateRange = [];
      if (this.dateFromFilter) dateRange.push(`From: ${this.dateFromFilter}`);
      if (this.dateToFilter) dateRange.push(`To: ${this.dateToFilter}`);
      filters.push(`Date: ${dateRange.join(', ')}`);
    }

    return filters.join(' | ');
  }
}
