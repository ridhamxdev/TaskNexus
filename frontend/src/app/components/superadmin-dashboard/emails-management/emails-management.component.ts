import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Email {
  id: number;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  sentAt: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  attempts?: number;
  failureReason?: string;
  sender?: {
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-emails-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emails-management.component.html',
  styleUrls: ['./emails-management.component.css']
})
export class EmailsManagementComponent implements OnInit, OnDestroy {
  @Input() emails: Email[] = [];
  
  // Error handling
  @Input() emailsError: string | null = null;
  
  // View Email Modal
  selectedEmail: Email | null = null;
  showEmailModal = false;
  
  // Filtering and search
  emailFilter = 'all';
  emailSearchTerm = '';
  emailDateFromFilter = '';
  emailDateToFilter = '';
  emailRecipientFilter = '';
  emailSubjectFilter = '';
  
  // Filter panel state
  showEmailFilters = false;
  hasActiveFilters = false;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  itemsPerPageOptions = [10, 25, 50, 100];
  
  // Sorting
  sortField: string = 'sentAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(private superadminService: SuperadminService) {}

  ngOnInit() {
    this.loadEmails();
  }

  ngOnDestroy() {}

  async loadEmails() {
    try {
      this.emailsError = null;
      this.emails = await this.superadminService.getAllEmails();
    } catch (error) {
      console.error('Error loading emails:', error);
      this.emailsError = 'Failed to load emails. Please try again.';
      this.emails = [];
    }
  }

  get filteredEmails(): Email[] {
    let filtered = [...this.emails];
    
    // Search filter
    if (this.emailSearchTerm) {
      const searchLower = this.emailSearchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.subject.toLowerCase().includes(searchLower) ||
        e.to.toLowerCase().includes(searchLower) ||
        e.body.toLowerCase().includes(searchLower) ||
        e.id.toString().includes(searchLower)
      );
    }

    // Status filter
    if (this.emailFilter !== 'all') {
      filtered = filtered.filter(e => e.status === this.emailFilter);
    }
    
    // Recipient filter
    if (this.emailRecipientFilter) {
      const recipientLower = this.emailRecipientFilter.toLowerCase();
      filtered = filtered.filter(e => e.to.toLowerCase().includes(recipientLower));
    }
    
    // Subject filter
    if (this.emailSubjectFilter) {
      const subjectLower = this.emailSubjectFilter.toLowerCase();
      filtered = filtered.filter(e => e.subject.toLowerCase().includes(subjectLower));
    }
    
    // Date range filter
    if (this.emailDateFromFilter) {
      const fromDate = new Date(this.emailDateFromFilter);
      filtered = filtered.filter(e => new Date(e.sentAt) >= fromDate);
    }

    if (this.emailDateToFilter) {
      const toDate = new Date(this.emailDateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => new Date(e.sentAt) <= toDate);
    }
    
    // Apply sorting
    return this.sortEmails(filtered);
  }

  get paginatedEmails() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredEmails.slice(startIndex, endIndex);
  }

  get totalPages() {
    return Math.ceil(this.filteredEmails.length / this.itemsPerPage);
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredEmails.length);
  }

  onPageSizeChange(newSize: number) {
    this.itemsPerPage = newSize;
    this.currentPage = 1;
  }

  goToFirstPage() {
    this.currentPage = 1;
  }

  goToLastPage() {
    this.currentPage = this.totalPages;
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

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getVisiblePages(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const maxVisiblePages = 5;
    const pages: number[] = [];

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than or equal to max visible pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate start and end of visible pages around current page
      let start = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
      let end = Math.min(totalPages - 1, start + maxVisiblePages - 3);

      // Adjust start if end is at its maximum
      if (end === totalPages - 1) {
        start = Math.max(2, end - (maxVisiblePages - 3));
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push(-1);
      }

      // Add visible pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push(-1);
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  }

  // Sorting methods
  sortEmails(emails: Email[]): Email[] {
    if (!this.sortField) return emails;

    return emails.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'sentAt':
          aValue = new Date(a.sentAt);
          bValue = new Date(b.sentAt);
          break;
        case 'subject':
          aValue = a.subject;
          bValue = b.subject;
          break;
        case 'to':
          aValue = a.to;
          bValue = b.to;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onSortChange() {
    // Sorting is applied automatically through the filteredEmails getter
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  }

  // Filter methods
  toggleFilters() {
    this.showEmailFilters = !this.showEmailFilters;
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

  clearAllFilters() {
    this.emailSearchTerm = '';
    this.emailFilter = 'all';
    this.emailRecipientFilter = '';
    this.emailSubjectFilter = '';
    this.emailDateFromFilter = '';
    this.emailDateToFilter = '';
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  applyFilters() {
    this.currentPage = 1;
    this.updateActiveFilters();
  }

  updateActiveFilters() {
    this.hasActiveFilters = !!(
      this.emailSearchTerm ||
      this.emailFilter !== 'all' ||
      this.emailRecipientFilter ||
      this.emailSubjectFilter ||
      this.emailDateFromFilter ||
      this.emailDateToFilter
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.emailSearchTerm) count++;
    if (this.emailFilter !== 'all') count++;
    if (this.emailRecipientFilter) count++;
    if (this.emailSubjectFilter) count++;
    if (this.emailDateFromFilter) count++;
    if (this.emailDateToFilter) count++;
    return count;
  }

  // Pagination methods
  onEmailPageSizeChange() {
    this.currentPage = 1;
  }

  getEmailStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  getEmailEndIndex(): number {
    return Math.min(this.getEmailStartIndex() + this.itemsPerPage, this.filteredEmails.length);
  }

  goToEmailFirstPage() {
    this.currentPage = 1;
  }

  goToEmailLastPage() {
    this.currentPage = this.totalPages;
  }

  goToEmailPrevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToEmailNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToEmailPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getEmailVisiblePages(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Export functionality removed - now using exportToPDF()

  exportToPDF() {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Emails Management Report', 14, 15);
    
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
    doc.text(`Total Emails: ${this.getTotalEmailsCount()}`, 14, 42);
    doc.text(`Sent Successfully: ${this.getEmailsByStatus('SENT').length}`, 14, 49);
    doc.text(`Failed: ${this.getEmailsByStatus('FAILED').length}`, 14, 56);
    doc.text(`Pending: ${this.getEmailsByStatus('PENDING').length}`, 14, 63);
    
    // Prepare table data
    const tableData = this.filteredEmails.map(email => [
      email.id.toString(),
      email.to,
      email.subject,
      email.status,
      this.formatDate(email.sentAt),
      email.failureReason || ''
    ]);
    
    // Add table
    autoTable(doc, {
      head: [['Email ID', 'Recipient', 'Subject', 'Status', 'Sent At', 'Failure Reason']],
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
        1: { cellWidth: 40 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20 },
        4: { cellWidth: 30 },
        5: { cellWidth: 40 }
      }
    });
    
    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`emails-${timestamp}.pdf`);
  }

  quickDateFilter(period: string) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (period) {
      case 'today':
        this.emailDateFromFilter = todayStr;
        this.emailDateToFilter = todayStr;
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        this.emailDateFromFilter = yesterdayStr;
        this.emailDateToFilter = yesterdayStr;
        break;
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        this.emailDateFromFilter = weekStart.toISOString().split('T')[0];
        this.emailDateToFilter = todayStr;
        break;
      case 'this-month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        this.emailDateFromFilter = monthStart.toISOString().split('T')[0];
        this.emailDateToFilter = todayStr;
        break;
      default:
        this.emailDateFromFilter = '';
        this.emailDateToFilter = '';
        break;
    }
    this.currentPage = 1;
  }

  get emailUsers() {
    const users: Array<{name?: string, email: string}> = [];
    
    // Add recipients
    this.emails.forEach(e => {
      users.push({ email: e.to });
    });
    
    // Add senders
    this.emails.forEach(e => {
      if (e.sender) {
        users.push({ name: e.sender.name, email: e.sender.email });
      }
    });
    
    // Remove duplicates based on email
    const uniqueUsers = users.filter((user, index, self) =>
      index === self.findIndex(u => u.email === user.email)
    );
    
    return uniqueUsers.sort((a, b) => 
      (a.name || a.email).localeCompare(b.name || b.email)
    );
  }

  async resendEmail(email: Email) {
    try {
      await this.superadminService.resendEmail(email.id);
      email.status = 'SENT';
    } catch (error) {
      console.error('Error resending email:', error);
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'SENT': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getEmailCountForUser(email: string): string {
    const count = this.emails.filter(e => 
      e.to === email || (e.sender && e.sender.email === email)
    ).length;
    return count === 1 ? '1 email' : `${count} emails`;
  }

  trackByEmail(index: number, email: Email): number {
    return email.id;
  }

  getEmailsByStatus(status: string): Email[] {
    return this.emails.filter(email => email.status === status);
  }

  // Summary calculations
  getTotalEmailsCount(): number {
    return this.emails.length;
  }

  // View Email Methods
  viewEmail(email: Email) {
    this.selectedEmail = email;
    this.showEmailModal = true;
  }

  closeEmailModal() {
    this.selectedEmail = null;
    this.showEmailModal = false;
  }
} 