import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';

interface Tenant {
  id: number;
  name: string;
  description?: string;
  subdomain: string;
  subscriptionTier: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  status: string;
  isActive: boolean;
  userCount: number;
  adminUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  tenantsByTier: Record<string, number>;
}

@Component({
  selector: 'app-tenant-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-list.component.html',
  styleUrls: ['./tenant-list.component.css']
})
export class TenantListComponent implements OnInit {
  tenants: Tenant[] = [];
  stats: TenantStats | null = null;
  loading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalTenants = 0;
  totalPages = 0;
  
  // Search and filters
  searchTerm = '';
  selectedTier = '';
  selectedStatus = '';
  
  // User permissions
  canCreateTenants = false;
  canManageTenants = false;
  
  // UI state
  selectedTenant: Tenant | null = null;
  showDeleteModal = false;
  showStatsModal = false;
  
  subscriptionTiers = [
    { value: '', label: 'All Tiers' },
    { value: 'basic', label: 'Basic' },
    { value: 'standard', label: 'Standard' },
    { value: 'premium', label: 'Premium' },
    { value: 'enterprise', label: 'Enterprise' }
  ];

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  constructor(
    private tenantService: TenantService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkPermissions();
    this.loadTenants();
    this.loadStats();
  }

  checkPermissions(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.canCreateTenants = user.role === 'superadmin';
      this.canManageTenants = ['superadmin', 'tenant'].includes(user.role);
    }
  }

  async loadTenants(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const params = {
        page: this.currentPage.toString(),
        limit: this.pageSize.toString(),
        search: this.searchTerm,
        tier: this.selectedTier,
        status: this.selectedStatus
      };

      const response = await this.tenantService.getTenants(params).toPromise();
      
      // Process tenant data to add isActive property
      const rawTenants = response.tenants || response.data || [];
      this.tenants = rawTenants.map((tenant: any) => ({
        ...tenant,
        isActive: tenant.status === 'active'
      }));
      this.totalTenants = response.total || response.pagination?.total || 0;
      this.totalPages = Math.ceil(this.totalTenants / this.pageSize);
      
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to load tenants';
      console.error('Failed to load tenants:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadStats(): Promise<void> {
    try {
      this.stats = await this.tenantService.getTenantStats().toPromise();
    } catch (error: any) {
      console.error('Failed to load tenant stats:', error);
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadTenants();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadTenants();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadTenants();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.totalTenants / this.pageSize);
    this.loadTenants();
  }

  createTenant(): void {
    this.router.navigate(['/tenants/create']);
  }

  viewTenant(tenant: Tenant): void {
    this.router.navigate(['/tenants', tenant.id]);
  }

  editTenant(tenant: Tenant): void {
    this.router.navigate(['/tenants', tenant.id, 'edit']);
  }

  manageTenantUsers(tenant: Tenant): void {
    this.router.navigate(['/tenants', tenant.id, 'users']);
  }

  async assignCurrentUserAsAdmin(tenant: Tenant): Promise<void> {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        this.error = 'No current user found';
        return;
      }

      await this.tenantService.assignTenantAdmin(tenant.id, currentUser.id).toPromise();
      
      // Update the tenant in the local list
      tenant.adminUser = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email
      };
      
      console.log(`Successfully assigned ${currentUser.name} as admin for tenant ${tenant.name}`);
      
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to assign admin user';
      console.error('Failed to assign admin user:', error);
    }
  }

  async toggleTenantStatus(tenant: Tenant): Promise<void> {
    try {
      const newStatus = !tenant.isActive;
      
      if (newStatus) {
        // Use the specific activate endpoint for better tenant activation
        await this.tenantService.activateTenant(tenant.id).toPromise();
      } else {
        // Use the generic status update for deactivation
        await this.tenantService.updateTenantStatus(tenant.id, newStatus).toPromise();
      }
      
      tenant.isActive = newStatus;
      
      // Show success message (you might want to use a toast service)
      console.log(`Tenant ${newStatus ? 'activated' : 'deactivated'} successfully`);
      
    } catch (error: any) {
      this.error = error.error?.message || `Failed to ${tenant.isActive ? 'deactivate' : 'activate'} tenant`;
      console.error('Failed to toggle tenant status:', error);
    }
  }

  confirmDeleteTenant(tenant: Tenant): void {
    this.selectedTenant = tenant;
    this.showDeleteModal = true;
  }

  async deleteTenant(): Promise<void> {
    if (!this.selectedTenant) return;

    try {
      await this.tenantService.deleteTenant(this.selectedTenant.id).toPromise();
      
      // Remove from local list
      this.tenants = this.tenants.filter(t => t.id !== this.selectedTenant!.id);
      this.totalTenants--;
      
      // Close modal
      this.showDeleteModal = false;
      this.selectedTenant = null;
      
      // Reload if current page is empty
      if (this.tenants.length === 0 && this.currentPage > 1) {
        this.currentPage--;
        this.loadTenants();
      }
      
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to delete tenant';
      console.error('Failed to delete tenant:', error);
    }
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.selectedTenant = null;
  }

  showStats(): void {
    this.showStatsModal = true;
  }

  closeStatsModal(): void {
    this.showStatsModal = false;
  }

  refreshList(): void {
    this.loadTenants();
    this.loadStats();
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  }

  getTierBadgeClass(tier: string): string {
    const classes = {
      'basic': 'bg-gray-100 text-gray-800',
      'standard': 'bg-blue-100 text-blue-800',
      'premium': 'bg-purple-100 text-purple-800',
      'enterprise': 'bg-yellow-100 text-yellow-800'
    };
    return classes[tier as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxPages = 5; // Show max 5 page numbers
    
    let start = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages - 1);
    
    // Adjust start if end is at maximum
    start = Math.max(1, end - maxPages + 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  trackByTenant(index: number, tenant: Tenant): number {
    return tenant.id;
  }

  // Math object for template
  Math = Math;
} 