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
  pageSizes = [5, 10, 25, 50];

  // Sorting properties
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private emailService: EmailService) {}

  ngOnInit() {
    this.loadSentEmails();
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

  loadSentEmails() {
    this.isLoading = true;
    this.error = null;

    this.emailService.getSentEmails().subscribe({
      next: (emails) => {
        this.sentEmails = emails;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sent emails:', error);
        this.error = 'Failed to load sent emails. Please try again.';
        this.isLoading = false;
      }
    });
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
        return 'pi pi-check';
      case 'PENDING':
        return 'pi pi-clock';
      case 'FAILED':
        return 'pi pi-times';
      default:
        return 'pi pi-question';
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
    // Reset to first page when sorting
    this.currentPage = 1;
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'pi-sort';
    }
    return this.sortDirection === 'asc' ? 'pi-sort-up' : 'pi-sort-down';
  }

  get sortedEmails() {
    if (!this.sortField) {
      return this.sentEmails;
    }

    return [...this.sentEmails].sort((a, b) => {
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
}
