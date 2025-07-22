import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';

interface TenantUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
  lastAccessAt?: string;
}

interface TenantStats {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  totalInvitations: number;
  monthlyActiveUsers: number;
  storageUsed: string;
}

interface Tenant {
  id: number;
  name: string;
  description?: string;
  username: string;
  subdomain?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  status: string;
  subscriptionTier: string;
  userCount: number;
  lastAccessDate?: string;
  createdAt: string;
  settings?: {
    maxUsers?: number;
    allowUserRegistration?: boolean;
    enableTwoFactor?: boolean;
    dashboardStyle?: {
      theme?: string;
      accentColor?: string;
      layout?: string;
      chartStyle?: string;
    };
    customBranding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
    features?: {
      emailService?: boolean;
      transactionManagement?: boolean;
      subscriptionManagement?: boolean;
    };
  };
}

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tenant-dashboard.component.html',
  styleUrls: ['./tenant-dashboard.component.css']
})
export class TenantDashboardComponent implements OnInit {
  tenantId!: number;
  tenant: Tenant | null = null;
  tenantStats: TenantStats | null = null;
  tenantUsers: TenantUser[] = [];
  tenantInvitations: any[] = [];
  
  // Current user information
  currentUser: any = null;
  isSuperAdmin = false;
  isTenantOwner = false;
  
  // Loading states
  loading = false;
  usersLoading = false;
  statsLoading = false;
  error = '';
  
  // UI States
  activeTab = 'overview';
  showInviteModal = false;
  showSettingsModal = false;
  
  // Invitation form
  inviteEmail = '';
  inviteMessage = '';
  inviteLoading = false;

  // User role management
  editingUserId: number | null = null;
  newRole = '';

  // Dashboard data for modern design
  customerChartData = [
    { height: 60, color: 'from-green-400 to-green-600' },
    { height: 80, color: 'from-green-400 to-green-600' },
    { height: 40, color: 'from-green-400 to-green-600' },
    { height: 90, color: 'from-green-400 to-green-600' },
    { height: 70, color: 'from-green-400 to-green-600' },
    { height: 50, color: 'from-orange-400 to-orange-600' },
    { height: 30, color: 'from-orange-400 to-orange-600' },
    { height: 85, color: 'from-green-400 to-green-600' },
    { height: 65, color: 'from-green-400 to-green-600' },
    { height: 45, color: 'from-orange-400 to-orange-600' }
  ];

  productDots = [
    { color: 'bg-green-500' }, { color: 'bg-green-500' }, { color: 'bg-orange-500' }, { color: 'bg-green-500' },
    { color: 'bg-green-500' }, { color: 'bg-orange-500' }, { color: 'bg-green-500' }, { color: 'bg-green-500' },
    { color: 'bg-green-500' }, { color: 'bg-green-500' }, { color: 'bg-orange-500' }, { color: 'bg-green-500' },
    { color: 'bg-orange-500' }, { color: 'bg-green-500' }, { color: 'bg-green-500' }, { color: 'bg-green-500' },
    { color: 'bg-green-500' }, { color: 'bg-orange-500' }, { color: 'bg-green-500' }, { color: 'bg-orange-500' },
    { color: 'bg-green-500' }, { color: 'bg-green-500' }, { color: 'bg-green-500' }, { color: 'bg-orange-500' },
    { color: 'bg-green-500' }, { color: 'bg-orange-500' }, { color: 'bg-green-500' }, { color: 'bg-green-500' },
    { color: 'bg-green-500' }, { color: 'bg-green-500' }, { color: 'bg-orange-500' }, { color: 'bg-green-500' }
  ];

  projectTimeline = [
    {
      time: '30:00',
      avatars: [
        { color: 'bg-blue-500' },
        { color: 'bg-green-500' },
        { color: 'bg-orange-500' }
      ],
      progress: 85,
      total: '30',
      bgColor: 'bg-gray-700',
      barColor: 'bg-green-500'
    },
    {
      time: '25:00',
      avatars: [
        { color: 'bg-orange-500' }
      ],
      progress: 95,
      total: '25',
      bgColor: 'bg-gray-700',
      barColor: 'bg-orange-500'
    },
    {
      time: '28:00',
      avatars: [
        { color: 'bg-blue-500' },
        { color: 'bg-green-500' },
        { color: 'bg-purple-500' },
        { color: 'bg-pink-500' }
      ],
      progress: 75,
      total: '28',
      bgColor: 'bg-gray-700',
      barColor: 'bg-gray-400'
    },
    {
      time: '29:00',
      avatars: [
        { color: 'bg-green-500' }
      ],
      progress: 100,
      total: '29',
      bgColor: 'bg-gray-700',
      barColor: 'bg-green-500'
    },
    {
      time: '25:00',
      avatars: [
        { color: 'bg-blue-500' },
        { color: 'bg-orange-500' },
        { color: 'bg-gray-500' },
        { color: 'bg-purple-500' }
      ],
      progress: 60,
      total: '25',
      bgColor: 'bg-gray-700',
      barColor: 'bg-green-500'
    },
    {
      time: '24:00',
      avatars: [
        { color: 'bg-blue-500' }
      ],
      progress: 40,
      total: '24',
      bgColor: 'bg-gray-700',
      barColor: 'bg-gray-400'
    }
  ];

  productItems = [
    { icon: '⚡', label: 'Resources', bgColor: 'bg-gray-600' },
    { icon: '💚', label: 'Valid', bgColor: 'bg-green-500' },
    { icon: '💚', label: 'Valid', bgColor: 'bg-green-500' },
    { icon: '💚', label: 'Valid', bgColor: 'bg-green-500' },
    { icon: '🧡', label: 'Invalid', bgColor: 'bg-orange-500' },
    { icon: '🧡', label: 'Invalid', bgColor: 'bg-orange-500' },
    { icon: '💚', label: 'Valid', bgColor: 'bg-green-500' },
    { icon: '🧡', label: 'Invalid', bgColor: 'bg-orange-500' },
    { icon: '🧡', label: 'Invalid', bgColor: 'bg-orange-500' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tenantService: TenantService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Get current user
    this.currentUser = this.authService.getUser();
    this.isSuperAdmin = this.currentUser?.role === 'superadmin';
    
    // Get tenant ID from route
    this.route.params.subscribe(async params => {
      this.tenantId = parseInt(params['id']);
      
          // Check access permissions
    if (this.currentUser?.role === 'tenant') {
      const userTenantId = this.currentUser.tenantId || this.currentUser.id;
      if (this.tenantId !== userTenantId) {
        // Redirect to their own dashboard if trying to access another tenant
        this.router.navigate([`/tenants/${userTenantId}`]);
        return;
      }
      this.isTenantOwner = true;
    } else if (this.currentUser?.role === 'superadmin') {
      // Superadmins can access any tenant dashboard
      this.isTenantOwner = false; // Not the owner, but has access
    } else {
      // Other users don't have access
      this.error = 'Access denied to this tenant';
      return;
    }
      
      await this.loadTenantData();
    });
  }
  
  async loadTenantData() {
    this.loading = true;
    this.error = '';
    
    try {
      // Load tenant details and stats in parallel
      const [tenant, stats] = await Promise.all([
        this.tenantService.getTenantById(this.tenantId).toPromise(),
        this.tenantService.getTenantStats(this.tenantId).toPromise()
      ]);
      
      this.tenant = tenant;
      this.tenantStats = stats;
      
      // Load users for the tenant
      await this.loadTenantUsers();
      await this.loadTenantInvitations();
      
    } catch (error: any) {
      console.error('Error loading tenant data:', error);
      this.error = error.error?.message || 'Failed to load tenant data';
    } finally {
      this.loading = false;
    }
  }

  async loadTenantUsers(page: number = 1): Promise<void> {
    if (!this.tenant) return;

    try {
      const response = await this.tenantService.getTenantUsers(this.tenant.id, page).toPromise();
      this.tenantUsers = response.users;
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to load users';
    }
  }

  async loadTenantInvitations() {
    if (!this.tenant) return;
    try {
      const response = await this.tenantService.getTenantInvitations(this.tenant.id).toPromise();
      this.tenantInvitations = response.invitations || [];
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to load invitations';
    }
  }

  async deleteAllInvitations() {
    if (!this.tenant) return;
    if (confirm('Are you sure you want to delete all invitations for this tenant?')) {
      try {
        await this.tenantService.deleteAllInvitationsForTenant(this.tenant.id).toPromise();
        await this.loadTenantInvitations();
        alert('All invitations deleted successfully!');
      } catch (error: any) {
        this.error = error.error?.message || 'Failed to delete invitations';
      }
    }
  }

  openInviteModal(): void {
    this.showInviteModal = true;
    this.inviteEmail = '';
    this.inviteMessage = '';
  }

  closeInviteModal(): void {
    this.showInviteModal = false;
    this.inviteLoading = false;
  }

  async sendInvitation(): Promise<void> {
    if (!this.tenant || !this.inviteEmail.trim()) return;

    try {
      this.inviteLoading = true;
      
      await this.tenantService.sendInvitation(this.tenant.id, {
        email: this.inviteEmail.trim(),
        message: this.inviteMessage.trim()
      }).toPromise();

      this.closeInviteModal();
      
      // Reload tenant stats to update pending invitations count
      if (this.tenant) {
        this.tenantStats = await this.tenantService.getTenantStats(this.tenant.id).toPromise();
      }
      await this.loadTenantInvitations(); // Reload invitations after sending
      
      alert('Invitation sent successfully!');
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to send invitation';
      this.inviteLoading = false;
    }
  }

  startEditingRole(userId: number, currentRole: string): void {
    this.editingUserId = userId;
    this.newRole = currentRole;
  }

  cancelEditingRole(): void {
    this.editingUserId = null;
    this.newRole = '';
  }

  async updateUserRole(userId: number): Promise<void> {
    if (!this.tenant || !this.newRole) return;

    try {
      await this.tenantService.updateUserRole(this.tenant.id, userId, this.newRole).toPromise();
      
      // Update the user in the local array
      const userIndex = this.tenantUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        this.tenantUsers[userIndex].role = this.newRole;
      }
      
      this.cancelEditingRole();
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to update user role';
    }
  }

  async removeUser(userId: number, userName: string): Promise<void> {
    if (!this.tenant) return;

    if (confirm(`Are you sure you want to remove ${userName} from this tenant?`)) {
      try {
        await this.tenantService.removeUserFromTenant(this.tenant.id, userId).toPromise();
        
        // Remove user from local array
        this.tenantUsers = this.tenantUsers.filter(u => u.id !== userId);
        
        // Update tenant stats
        if (this.tenant && this.tenantStats) {
          this.tenantStats.totalUsers--;
          this.tenantStats.activeUsers--;
        }
        
      } catch (error: any) {
        this.error = error.error?.message || 'Failed to remove user';
      }
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'bg-red-900/50 text-red-300 border border-red-700';
      case 'moderator':
        return 'bg-blue-900/50 text-blue-300 border border-blue-700';
      case 'member':
        return 'bg-green-900/50 text-green-300 border border-green-700';
      case 'viewer':
        return 'bg-gray-700/50 text-gray-300 border border-gray-600';
      default:
        return 'bg-gray-700/50 text-gray-300 border border-gray-600';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  clearError(): void {
    this.error = '';
  }

  navigateToTenantSettings(): void {
    if (this.tenant) {
      this.router.navigate(['/tenant', this.tenant.id, 'settings']);
    }
  }

  navigateToInvitations(): void {
    if (this.tenant) {
      this.router.navigate(['/tenant', this.tenant.id, 'invitations']);
    }
  }

  getDashboardThemeClass(): string {
    if (!this.tenant) {
      return 'bg-gray-900 text-white';
    }
    
    const theme = this.tenant.settings?.dashboardStyle?.theme || 'modern-dark';
    
    switch (theme) {
      case 'modern-dark':
        return 'bg-gray-900 text-white';
      case 'classic-light':
        return 'bg-gray-50 text-gray-900';
      case 'dark-blue':
        return 'bg-blue-900 text-white';
      case 'minimal-gray':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-900 text-white';
    }
  }

  getCurrentUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (user && user.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return names[0].charAt(0).toUpperCase() + names[1].charAt(0).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    return 'U';
  }

  async resendInvitation(invitationId: number, message?: string) {
    try {
      await this.tenantService.resendInvitation(invitationId, message).toPromise();
      await this.loadTenantInvitations();
      alert('Invitation resent successfully!');
    } catch (error: any) {
      this.error = error.error?.message || 'Failed to resend invitation';
    }
  }
} 