import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';

interface TenantUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  permissions: string[];
  joinedAt: string;
  lastLogin?: string;
  isActive: boolean;
  invitationStatus?: string;
}

interface UserRole {
  value: string;
  label: string;
  description: string;
  permissions: string[];
}

@Component({
  selector: 'app-tenant-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './tenant-permissions.component.html',
  styleUrls: ['./tenant-permissions.component.css']
})
export class TenantPermissionsComponent implements OnInit {
  tenantId!: number;
  tenant: any = null;
  users: TenantUser[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalUsers = 0;

  // Search and filters
  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';

  // User permissions
  canManageUsers = false;
  canInviteUsers = false;

  // UI state
  selectedUser: TenantUser | null = null;
  showRoleModal = false;
  showInviteModal = false;
  showRemoveModal = false;
  
  // Forms
  roleForm: FormGroup;
  inviteForm: FormGroup;

  userRoles: UserRole[] = [
    {
      value: 'viewer',
      label: 'Viewer',
      description: 'Can view data but cannot make changes',
      permissions: ['read']
    },
    {
      value: 'member',
      label: 'Member',
      description: 'Can perform basic operations within the tenant',
      permissions: ['read', 'create', 'update_own']
    },
    {
      value: 'moderator',
      label: 'Moderator',
      description: 'Can manage content and moderate users',
      permissions: ['read', 'create', 'update', 'moderate']
    },
    {
      value: 'admin',
      label: 'Administrator',
      description: 'Full control over tenant settings and users',
      permissions: ['read', 'create', 'update', 'delete', 'manage_users', 'manage_settings']
    }
  ];

  roleOptions = [
    { value: '', label: 'All Roles' },
    ...this.userRoles
  ];

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'inactive', label: 'Inactive' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private tenantService: TenantService,
    private authService: AuthService
  ) {
    this.roleForm = this.createRoleForm();
    this.inviteForm = this.createInviteForm();
  }

  ngOnInit(): void {
    this.tenantId = Number(this.route.snapshot.paramMap.get('id'));
    this.checkPermissions();
    this.loadTenant();
    this.loadUsers();
  }

  createRoleForm(): FormGroup {
    return this.fb.group({
      role: ['', [Validators.required]]
    });
  }

  createInviteForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      role: ['member', [Validators.required]],
      message: ['', [Validators.maxLength(500)]]
    });
  }

  async checkPermissions(): Promise<void> {
    try {
      const user = this.authService.getCurrentUser();
      if (user?.role === 'superadmin') {
        this.canManageUsers = true;
        this.canInviteUsers = true;
      } else {
        const permissions = await this.tenantService.checkUserPermissions(this.tenantId).toPromise();
        this.canManageUsers = permissions.canManageUsers;
        this.canInviteUsers = permissions.canInviteUsers;
      }
    } catch (error: any) {
      console.error('Failed to check permissions:', error);
    }
  }

  async loadTenant(): Promise<void> {
    try {
      this.tenant = await this.tenantService.getTenantById(this.tenantId).toPromise();
    } catch (error: any) {
      this.error = 'Failed to load tenant information';
      console.error('Failed to load tenant:', error);
    }
  }

  async loadUsers(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const response = await this.tenantService.getTenantUsers(
        this.tenantId,
        this.currentPage,
        this.pageSize
      ).toPromise();

      this.users = response.users || response.data || [];
      this.totalUsers = response.total || 0;

    } catch (error: any) {
      this.error = error.error?.message || 'Failed to load users';
      console.error('Failed to load users:', error);
    } finally {
      this.loading = false;
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  openRoleModal(user: TenantUser): void {
    this.selectedUser = user;
    this.roleForm.patchValue({ role: user.role });
    this.showRoleModal = true;
  }

  async updateUserRole(): Promise<void> {
    if (!this.selectedUser || this.roleForm.invalid) return;

    try {
      const newRole = this.roleForm.value.role;
      
      await this.tenantService.updateUserRole(
        this.tenantId,
        this.selectedUser.id,
        newRole
      ).toPromise();

      this.selectedUser.role = newRole;
      this.selectedUser.permissions = this.getRolePermissions(newRole);
      
      this.success = `User role updated to ${this.getRoleLabel(newRole)}`;
      this.closeRoleModal();

    } catch (error: any) {
      this.error = error.error?.message || 'Failed to update user role';
      console.error('Failed to update role:', error);
    }
  }

  openInviteModal(): void {
    this.inviteForm.reset();
    this.inviteForm.patchValue({ role: 'member' });
    this.showInviteModal = true;
  }

  async sendInvitation(): Promise<void> {
    if (this.inviteForm.invalid) return;

    try {
      const formData = this.inviteForm.value;
      
      await this.tenantService.sendInvitation(this.tenantId, {
        email: formData.email,
        invitationType: 'email',
        message: formData.message,
        metadata: {
          userRole: formData.role,
          permissions: this.getRolePermissions(formData.role),
          welcomeMessage: `Welcome to ${this.tenant?.name}!`,
          redirectUrl: `/tenants/${this.tenantId}`
        }
      }).toPromise();

      this.success = `Invitation sent to ${formData.email}`;
      this.closeInviteModal();
      this.loadUsers(); // Refresh to show pending invitation

    } catch (error: any) {
      this.error = error.error?.message || 'Failed to send invitation';
      console.error('Failed to send invitation:', error);
    }
  }

  confirmRemoveUser(user: TenantUser): void {
    this.selectedUser = user;
    this.showRemoveModal = true;
  }

  async removeUser(): Promise<void> {
    if (!this.selectedUser) return;

    try {
      await this.tenantService.removeUserFromTenant(
        this.tenantId,
        this.selectedUser.id
      ).toPromise();

      this.users = this.users.filter(u => u.id !== this.selectedUser!.id);
      this.totalUsers--;
      
      this.success = `${this.selectedUser.name} removed from tenant`;
      this.closeRemoveModal();

    } catch (error: any) {
      this.error = error.error?.message || 'Failed to remove user';
      console.error('Failed to remove user:', error);
    }
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
    this.roleForm.reset();
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    this.inviteForm.reset();
  }

  closeRemoveModal(): void {
    this.showRemoveModal = false;
    this.selectedUser = null;
  }

  getRoleLabel(roleValue: string): string {
    const role = this.userRoles.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  }

  getRoleDescription(roleValue: string): string {
    const role = this.userRoles.find(r => r.value === roleValue);
    return role ? role.description : '';
  }

  getRolePermissions(roleValue: string): string[] {
    const role = this.userRoles.find(r => r.value === roleValue);
    return role ? role.permissions : [];
  }

  getRoleBadgeClass(role: string): string {
    const classes = {
      'viewer': 'bg-gray-100 text-gray-800',
      'member': 'bg-blue-100 text-blue-800',
      'moderator': 'bg-yellow-100 text-yellow-800',
      'admin': 'bg-red-100 text-red-800'
    };
    return classes[role as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      'active': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'inactive': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
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

  goBack(): void {
    this.router.navigate(['/tenants']);
  }

  trackByUser(index: number, user: TenantUser): number {
    return user.id;
  }
} 