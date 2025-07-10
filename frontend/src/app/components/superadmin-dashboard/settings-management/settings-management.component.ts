import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../services/superadmin.service';
import { AuthService } from '../../../services/auth.service';

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

interface Settings {
  dailyDeductionAmount: number;
  emailNotifications: {
    transactions: boolean;
    dailyDeductions: boolean;
  };
  lastUpdated?: string;
}

interface GlobalFeeVersion {
  id: number;
  userId: number;
  version: string;
  changeDescription: string;
  affectedFeeTypes: string[];
  changedBy: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  changedByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-settings-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-management.component.html',
  styleUrls: ['./settings-management.component.css']
})
export class SettingsManagementComponent implements OnInit, OnDestroy {
  @Input() users: User[] = [];
  
  // Settings state
  settings: Settings = {
    dailyDeductionAmount: 10,
    emailNotifications: {
      transactions: true,
      dailyDeductions: false,
    }
  };
  
  // Loading states
  isSavingSettings = false;
  
  // Role management
  showRoleManagement = false;
  roleSearchTerm = '';
  roleFilterType = '';
  isUpdatingRole = false;

  // Fee version management
  showFeeVersionManagement = false;
  globalFeeVersions: GlobalFeeVersion[] = [];
  versionSearchTerm = '';
  versionFilter = '';
  selectedUserIds: number[] = [];
  isLoadingVersions = false;
  isBulkUpdating = false;
  bulkVersionType: 'major' | 'minor' | 'patch' = 'patch';
  bulkChangeDescription = '';

  constructor(
    private superadminService: SuperadminService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.loadSettings();
    this.loadGlobalFeeVersions();
  }

  ngOnDestroy() {}

  async loadSettings() {
    try {
      const response = await this.superadminService.getSettings();
      if (response) {
        this.settings = { ...this.settings, ...response };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      this.isSavingSettings = true;
      await this.superadminService.updateSettings(this.settings);
      // Update lastUpdated timestamp
      this.settings.lastUpdated = new Date().toISOString();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      this.isSavingSettings = false;
    }
  }

  toggleRoleManagement() {
    this.showRoleManagement = !this.showRoleManagement;
  }

  get filteredRoleUsers() {
    let filtered = [...this.users];

    // Apply search filter
    if (this.roleSearchTerm) {
      const searchTerm = this.roleSearchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Apply role filter
    if (this.roleFilterType) {
      filtered = filtered.filter(user => user.role === this.roleFilterType);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  onRoleSearchChange() {
    // Trigger filter update
  }

  onRoleFilterChange() {
    // Trigger filter update
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'user':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }

  async updateUserRole(user: User, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value;
    
    if (newRole === user.role) {
      return; // No change
    }

    try {
      this.isUpdatingRole = true;
      await this.superadminService.updateUserRole(user.id, newRole);
      
      // Update local user object
      user.role = newRole;
      
      // Show success message or handle success
      console.log(`User ${user.name} role updated to ${newRole}`);
    } catch (error) {
      console.error('Error updating user role:', error);
      // Revert the select value on error
      select.value = user.role;
    } finally {
      this.isUpdatingRole = false;
    }
  }

  async impersonateUser(user: User) {
    try {
      const response = await this.superadminService.startImpersonation(user);
      
      if (response?.token) {
        // Store the impersonation token
        localStorage.setItem('impersonation_token', response.token);
        localStorage.setItem('original_token', localStorage.getItem('token') || '');
        localStorage.setItem('token', response.token);
        
        // Redirect to user dashboard
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Error impersonating user:', error);
    }
  }

  getUserCountByRole(role: string): number {
    return this.users.filter(user => user.role === role).length;
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

  // Fee Version Management Methods
  toggleFeeVersionManagement() {
    this.showFeeVersionManagement = !this.showFeeVersionManagement;
    if (this.showFeeVersionManagement) {
      this.loadGlobalFeeVersions();
    }
  }

  async loadGlobalFeeVersions() {
    try {
      this.isLoadingVersions = true;
      this.globalFeeVersions = await this.superadminService.getAllGlobalFeeVersions();
    } catch (error) {
      console.error('Error loading global fee versions:', error);
      this.globalFeeVersions = [];
    } finally {
      this.isLoadingVersions = false;
    }
  }

  get filteredVersionUsers() {
    let filtered = [...this.globalFeeVersions];

    // Apply search filter
    if (this.versionSearchTerm) {
      const searchTerm = this.versionSearchTerm.toLowerCase();
      filtered = filtered.filter(version => 
        version.user?.name?.toLowerCase().includes(searchTerm) ||
        version.user?.email?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply version filter
    if (this.versionFilter) {
      filtered = filtered.filter(version => version.version === this.versionFilter);
    }

    return filtered.sort((a, b) => 
      (a.user?.name || '').localeCompare(b.user?.name || '')
    );
  }

  onVersionSearchChange() {
    // Trigger filter update - will be handled by getter
  }

  onVersionFilterChange() {
    // Trigger filter update - will be handled by getter
  }

  get isAllSelected(): boolean {
    return this.filteredVersionUsers.length > 0 && 
           this.filteredVersionUsers.every(version => 
             this.selectedUserIds.includes(version.userId)
           );
  }

  toggleSelectAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      // Select all filtered users
      this.selectedUserIds = [
        ...new Set([
          ...this.selectedUserIds,
          ...this.filteredVersionUsers.map(version => version.userId)
        ])
      ];
    } else {
      // Unselect all filtered users
      const filteredUserIds = this.filteredVersionUsers.map(version => version.userId);
      this.selectedUserIds = this.selectedUserIds.filter(id => !filteredUserIds.includes(id));
    }
  }

  toggleUserSelection(userId: number, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      if (!this.selectedUserIds.includes(userId)) {
        this.selectedUserIds.push(userId);
      }
    } else {
      this.selectedUserIds = this.selectedUserIds.filter(id => id !== userId);
    }
  }

  async bulkIncrementVersions() {
    if (this.selectedUserIds.length === 0 || !this.bulkChangeDescription) {
      return;
    }

    try {
      this.isBulkUpdating = true;
      await this.superadminService.bulkIncrementGlobalFeeVersions(
        this.selectedUserIds,
        this.bulkVersionType,
        this.bulkChangeDescription
      );

      // Clear selections and refresh
      this.selectedUserIds = [];
      this.bulkChangeDescription = '';
      await this.loadGlobalFeeVersions();

      console.log('Bulk version update completed successfully');
    } catch (error) {
      console.error('Error bulk updating versions:', error);
    } finally {
      this.isBulkUpdating = false;
    }
  }

  async editUserVersion(userVersion: GlobalFeeVersion) {
    const newVersion = prompt(
      `Enter new version for ${userVersion.user?.name}:`,
      userVersion.version
    );
    
    if (newVersion && newVersion !== userVersion.version) {
      const changeDescription = prompt(
        'Describe the changes:',
        ''
      );

      if (changeDescription) {
        try {
          await this.superadminService.setGlobalFeeVersion(
            userVersion.userId,
            newVersion,
            changeDescription
          );
          
          await this.loadGlobalFeeVersions();
          console.log(`Version updated for ${userVersion.user?.name}`);
        } catch (error) {
          console.error('Error updating user version:', error);
        }
      }
    }
  }

  async resetUserVersion(userVersion: GlobalFeeVersion) {
    const confirmed = confirm(
      `Are you sure you want to reset ${userVersion.user?.name}'s fee version to v1.0.0?`
    );

    if (confirmed) {
      const changeDescription = prompt(
        'Reason for reset:',
        'Reset to default version'
      );

      if (changeDescription) {
        try {
          await this.superadminService.resetGlobalFeeVersion(
            userVersion.userId,
            changeDescription
          );
          
          await this.loadGlobalFeeVersions();
          console.log(`Version reset for ${userVersion.user?.name}`);
        } catch (error) {
          console.error('Error resetting user version:', error);
        }
      }
    }
  }

  viewVersionHistory(userVersion: GlobalFeeVersion) {
    // This could open a modal or navigate to a detailed view
    // For now, we'll log the information
    console.log('Version History for:', userVersion.user?.name);
    console.log('Current Version:', userVersion.version);
    console.log('Last Change:', userVersion.changeDescription);
    console.log('Changed By:', userVersion.changedByUser?.name);
    console.log('Last Updated:', userVersion.updatedAt);

    // TODO: Implement version history modal/component
    alert(`Version History for ${userVersion.user?.name}\n\nCurrent Version: v${userVersion.version}\nLast Change: ${userVersion.changeDescription}\nChanged By: ${userVersion.changedByUser?.name || 'System'}\nLast Updated: ${this.formatDate(userVersion.updatedAt)}`);
  }

  getVersionCount(version: string): number {
    if (version === '1.0.0') {
      return this.globalFeeVersions.filter(v => v.version === '1.0.0').length;
    } else if (version === '1.1.0') {
      return this.globalFeeVersions.filter(v => 
        v.version.startsWith('1.1.') || v.version.startsWith('1.2.') || v.version.startsWith('1.3.')
      ).length;
    } else if (version === '2.0.0') {
      return this.globalFeeVersions.filter(v => v.version.startsWith('2.')).length;
    }
    return 0;
  }
} 