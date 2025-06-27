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

  constructor(
    private superadminService: SuperadminService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.loadSettings();
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
} 