import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
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

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-management.component.html',
  styleUrls: ['./users-management.component.css']
})
export class UsersManagementComponent {
  @Input() users: User[] = [];
  @Input() usersError: string | null = null;
  @Input() isLoading: boolean = false;
  @Output() loadUsers = new EventEmitter<void>();
  @Output() clearError = new EventEmitter<void>();

  // Search and filters
  userSearchTerm = '';
  userRoleFilter = 'all';
  userStatusFilter = 'all';
  userDateFromFilter = '';
  userDateToFilter = '';
  userBalanceMinFilter: number | null = null;
  userBalanceMaxFilter: number | null = null;

  // Filter panel states
  showUserFilters = false;
  hasActiveUserFilters = false;

  // Sorting properties for users
  userSortField: string = '';
  userSortDirection: 'asc' | 'desc' = 'asc';

  error: string | null = null;

  constructor(
    public auth: AuthService,
    private router: Router,
    private superadminService: SuperadminService
  ) {}

  // User management
  get filteredUsers() {
    let filtered = [...this.users];

    // Search filter
    if (this.userSearchTerm) {
      const searchLower = this.userSearchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.phone.toLowerCase().includes(searchLower) ||
        user.id.toString().includes(searchLower)
      );
    }

    // Role filter
    if (this.userRoleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === this.userRoleFilter);
    }

    // Status filter
    if (this.userStatusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === this.userStatusFilter);
    }

    // Date range filter
    if (this.userDateFromFilter) {
      const fromDate = new Date(this.userDateFromFilter);
      filtered = filtered.filter(user => new Date(user.createdAt) >= fromDate);
    }

    if (this.userDateToFilter) {
      const toDate = new Date(this.userDateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(user => new Date(user.createdAt) <= toDate);
    }

    // Balance range filter
    if (this.userBalanceMinFilter !== null && this.userBalanceMinFilter >= 0) {
      filtered = filtered.filter(user => user.balance >= this.userBalanceMinFilter!);
    }

    if (this.userBalanceMaxFilter !== null && this.userBalanceMaxFilter >= 0) {
      filtered = filtered.filter(user => user.balance <= this.userBalanceMaxFilter!);
    }

    return filtered;
  }

  async impersonateUser(user: User) {
    if (user.role === 'superadmin') {
      return; // Cannot impersonate another superadmin
    }

    try {
      this.isLoading = true;
      
      const response = await this.superadminService.startImpersonation(user);
      
      // Use auth service to begin impersonation
      this.auth.beginImpersonation(response.targetUser, response.impersonationToken);
      
      // Navigate to user dashboard
      this.router.navigate(['/dashboard'], { replaceUrl: true });
      
    } catch (error) {
      console.error('Error starting impersonation:', error);
      this.error = 'Failed to start user impersonation. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  viewUserDetails(userId: number) {
    this.router.navigate(['/user', userId]);
  }

  // Sorting methods for users
  sortUsers(field: string) {
    if (this.userSortField === field) {
      this.userSortDirection = this.userSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.userSortField = field;
      this.userSortDirection = 'asc';
    }
  }

  getUserSortIcon(field: string): string {
    if (this.userSortField !== field) {
      return 'pi-sort';
    }
    return this.userSortDirection === 'asc' ? 'pi-sort-up' : 'pi-sort-down';
  }

  get sortedUsers() {
    if (!this.userSortField) {
      return this.filteredUsers;
    }

    return [...this.filteredUsers].sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.userSortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'email':
          valueA = a.email.toLowerCase();
          valueB = b.email.toLowerCase();
          break;
        case 'role':
          valueA = a.role.toLowerCase();
          valueB = b.role.toLowerCase();
          break;
        case 'phone':
          valueA = a.phone;
          valueB = b.phone;
          break;
        case 'balance':
          valueA = a.balance;
          valueB = b.balance;
          break;
        case 'status':
          valueA = a.status;
          valueB = b.status;
          break;
        case 'createdAt':
          valueA = new Date(a.createdAt);
          valueB = new Date(b.createdAt);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return this.userSortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.userSortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Toggle filter panels
  toggleUserFilters() {
    this.showUserFilters = !this.showUserFilters;
  }

  // Filter by user status (quick filters)
  filterUsersByStatus(status: string) {
    this.userStatusFilter = status;
    this.updateActiveUserFilters();
  }

  // Clear all filters
  clearAllUserFilters() {
    this.userSearchTerm = '';
    this.userRoleFilter = 'all';
    this.userStatusFilter = 'all';
    this.userDateFromFilter = '';
    this.userDateToFilter = '';
    this.userBalanceMinFilter = null;
    this.userBalanceMaxFilter = null;
    this.userSortField = '';
    this.userSortDirection = 'asc';
    this.updateActiveUserFilters();
  }

  // Update active filter states
  updateActiveUserFilters() {
    this.hasActiveUserFilters = 
      this.userSearchTerm !== '' ||
      this.userRoleFilter !== 'all' ||
      this.userStatusFilter !== 'all' ||
      this.userDateFromFilter !== '' ||
      this.userDateToFilter !== '' ||
      (this.userBalanceMinFilter !== null && this.userBalanceMinFilter >= 0) ||
      (this.userBalanceMaxFilter !== null && this.userBalanceMaxFilter >= 0);
  }

  // Get active filter counts
  getActiveUserFiltersCount(): number {
    let count = 0;
    if (this.userSearchTerm !== '') count++;
    if (this.userRoleFilter !== 'all') count++;
    if (this.userStatusFilter !== 'all') count++;
    if (this.userDateFromFilter !== '' || this.userDateToFilter !== '') count++;
    if ((this.userBalanceMinFilter !== null && this.userBalanceMinFilter >= 0) || 
        (this.userBalanceMaxFilter !== null && this.userBalanceMaxFilter >= 0)) count++;
    return count;
  }

  // Get filter summaries
  getUserFilterSummary(): string {
    const filters = [];
    if (this.userSearchTerm) filters.push(`Search: ${this.userSearchTerm}`);
    if (this.userRoleFilter !== 'all') filters.push(`Role: ${this.userRoleFilter}`);
    if (this.userStatusFilter !== 'all') filters.push(`Status: ${this.userStatusFilter}`);
    if (this.userDateFromFilter || this.userDateToFilter) {
      const from = this.userDateFromFilter || 'Start';
      const to = this.userDateToFilter || 'End';
      filters.push(`Date: ${from} - ${to}`);
    }
    if (this.userBalanceMinFilter !== null || this.userBalanceMaxFilter !== null) {
      const min = this.userBalanceMinFilter || 0;
      const max = this.userBalanceMaxFilter || '∞';
      filters.push(`Balance: ₹${min} - ₹${max}`);
    }
    return filters.join(', ');
  }

  // Apply filters (trigger filter updates)
  applyUserFilters() {
    this.updateActiveUserFilters();
  }

  // Methods to be called when filter inputs change (for ngModelChange)
  onUserSearchChange() {
    this.updateActiveUserFilters();
  }

  onUserFilterChange() {
    this.updateActiveUserFilters();
  }

  onUserDateChange() {
    this.updateActiveUserFilters();
  }

  onUserBalanceChange() {
    this.updateActiveUserFilters();
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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

  onLoadUsers() {
    this.loadUsers.emit();
  }

  onClearError() {
    this.clearError.emit();
  }

  getRoleBadgeColor(role: string): string {
    switch (role.toLowerCase()) {
      case 'superadmin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'user':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  getStatusBadgeColor(status: string): string {
    return status === 'Active' ? 
      'bg-green-500/20 text-green-400 border-green-500/30' : 
      'bg-red-500/20 text-red-400 border-red-500/30';
  }
} 