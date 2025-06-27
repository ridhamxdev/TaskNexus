import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';

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
  
  // Filtering and search
  emailFilter = 'all';
  emailUserFilter = '';
  emailSearchTerm = '';
  emailDateFromFilter = '';
  emailDateToFilter = '';
  emailRecipientFilter = '';
  emailSubjectFilter = '';
  
  // Dropdown states
  showEmailFilters = false;
  showEmailUserDropdown = false;
  hasActiveEmailFilters = false;
  
  // Selected items
  selectedEmailUser: {name?: string, email: string} | null = null;
  
  // Pagination
  emailCurrentPage = 1;
  emailItemsPerPage = 10;
  emailPageSizes = [5, 10, 25, 50, 100];
  
  // Sorting
  emailSortField: string = '';
  emailSortDirection: 'asc' | 'desc' = 'asc';

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

  get filteredEmails() {
    let filtered = [...this.emails];
    
    // Filter by email status
    if (this.emailFilter !== 'all') {
      filtered = filtered.filter(e => e.status === this.emailFilter);
    }
    
    // Filter by user
    if (this.emailUserFilter) {
      filtered = filtered.filter(e => 
        e.to.toLowerCase().includes(this.emailUserFilter.toLowerCase()) ||
        (e.sender?.name && e.sender.name.toLowerCase().includes(this.emailUserFilter.toLowerCase())) ||
        (e.sender?.email && e.sender.email.toLowerCase().includes(this.emailUserFilter.toLowerCase()))
      );
    }
    
    // General search across email data
    if (this.emailSearchTerm) {
      const searchLower = this.emailSearchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.subject.toLowerCase().includes(searchLower) ||
        e.to.toLowerCase().includes(searchLower) ||
        e.body.toLowerCase().includes(searchLower) ||
        e.id.toString().includes(searchLower) ||
        (e.sender?.name && e.sender.name.toLowerCase().includes(searchLower)) ||
        (e.sender?.email && e.sender.email.toLowerCase().includes(searchLower))
      );
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
    
    return filtered;
  }

  get paginatedEmails() {
    const startIndex = (this.emailCurrentPage - 1) * this.emailItemsPerPage;
    const endIndex = startIndex + this.emailItemsPerPage;
    return this.filteredEmails.slice(startIndex, endIndex);
  }

  get emailTotalPages() {
    return Math.ceil(this.filteredEmails.length / this.emailItemsPerPage);
  }

  get emailPaginationInfo() {
    const startItem = (this.emailCurrentPage - 1) * this.emailItemsPerPage + 1;
    const endItem = Math.min(this.emailCurrentPage * this.emailItemsPerPage, this.filteredEmails.length);
    const totalItems = this.filteredEmails.length;
    return `Showing ${startItem}-${endItem} of ${totalItems} emails`;
  }

  clearEmailFilters() {
    this.emailFilter = 'all';
    this.emailUserFilter = '';
    this.emailSearchTerm = '';
    this.emailDateFromFilter = '';
    this.emailDateToFilter = '';
    this.emailRecipientFilter = '';
    this.emailSubjectFilter = '';
    this.selectedEmailUser = null;
    this.emailCurrentPage = 1;
  }

  toggleEmailUserDropdown() {
    this.showEmailUserDropdown = !this.showEmailUserDropdown;
  }

  selectEmailUser(user: {name?: string, email: string} | null) {
    this.selectedEmailUser = user;
    this.emailUserFilter = user ? user.email : '';
    this.showEmailUserDropdown = false;
    this.emailCurrentPage = 1;
  }

  removeEmailUserFilter() {
    this.selectedEmailUser = null;
    this.emailUserFilter = '';
  }

  filterEmailsByStatus(status: string) {
    this.emailFilter = status;
    this.emailCurrentPage = 1;
  }

  filterEmailsByDateRange(range: string) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (range) {
      case 'today':
        this.emailDateFromFilter = todayStr;
        this.emailDateToFilter = todayStr;
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
    this.emailCurrentPage = 1;
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

  goToEmailPage(page: number) {
    if (page >= 1 && page <= this.emailTotalPages) {
      this.emailCurrentPage = page;
    }
  }

  nextEmailPage() {
    if (this.emailCurrentPage < this.emailTotalPages) {
      this.emailCurrentPage++;
    }
  }

  previousEmailPage() {
    if (this.emailCurrentPage > 1) {
      this.emailCurrentPage--;
    }
  }

  changeEmailPageSize(newSize: number) {
    this.emailItemsPerPage = newSize;
    this.emailCurrentPage = 1;
  }

  toggleEmailFilters() {
    this.showEmailFilters = !this.showEmailFilters;
  }

  onEmailSearchChange() {
    this.emailCurrentPage = 1;
  }

  onEmailFilterChange() {
    this.emailCurrentPage = 1;
  }

  onEmailDateChange() {
    this.emailCurrentPage = 1;
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
} 