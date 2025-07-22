import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TenantService } from '../../services/tenant.service';

@Component({
  selector: 'app-bulk-tenant-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-tenant-management.component.html',
  styleUrls: ['./bulk-tenant-management.component.css']
})
export class BulkTenantManagementComponent implements OnInit {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
  @Output() tenantsUpdated = new EventEmitter<void>();
  
  activeTab = 'clear';
  
  // Clear All functionality
  confirmationText = '';
  isClearing = false;
  
  // Bulk Create functionality
  inputMethod = 'form';
  // Form data for creating tenants
  newTenant = {
    name: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    age: null as number | null,
    address: '',
    description: ''
  };
  tenantsToCreate: any[] = [];
  csvData = '';
  csvErrors: string[] = [];
  isCreating = false;
  bulkLoading = false;
  bulkError = '';
  bulkSuccess = '';
  
  // Results
  operationResult: any = null;

  constructor(private tenantService: TenantService) {}

  ngOnInit(): void {}

  openModal(): void {
    this.isVisible = true;
    this.resetForm();
  }

  closeModal(): void {
    this.isVisible = false;
    this.resetForm();
    this.close.emit();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.operationResult = null;
  }

  resetForm(): void {
    this.confirmationText = '';
    this.newTenant = {
      name: '',
      email: '',
      username: '',
      password: '',
      phone: '',
      age: null,
      address: '',
      description: ''
    };
    this.tenantsToCreate = [];
    this.csvData = '';
    this.csvErrors = [];
    this.operationResult = null;
    this.activeTab = 'clear';
    this.inputMethod = 'form';
    this.bulkError = '';
    this.bulkSuccess = '';
  }

  // Clear All Tenants functionality
  async clearAllTenants(): Promise<void> {
    if (this.confirmationText !== 'DELETE ALL TENANTS') {
      return;
    }

    this.isClearing = true;
    this.operationResult = null;

    try {
      const result = await this.tenantService.clearAllTenants().toPromise();
      this.operationResult = {
        success: true,
        title: 'Success!',
        message: `Successfully cleared all tenants. ${result.deletedCount} tenants were removed.`
      };
      this.confirmationText = '';
      this.tenantsUpdated.emit();
    } catch (error: any) {
      console.error('Error clearing tenants:', error);
      this.operationResult = {
        success: false,
        title: 'Error',
        message: error?.error?.message || 'Failed to clear tenants. Please try again.'
      };
    } finally {
      this.isClearing = false;
    }
  }

  // Bulk Create functionality
  addTenantToList(): void {
    if (!this.newTenant.name || !this.newTenant.email || !this.newTenant.username || !this.newTenant.password) {
      this.bulkError = 'Name, email, username, and password are required';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newTenant.email)) {
      this.bulkError = 'Please enter a valid email format';
      return;
    }

    // Check for duplicates
    const isDuplicate = this.tenantsToCreate.some(tenant => 
      tenant.name.toLowerCase() === this.newTenant.name.toLowerCase() ||
      tenant.email.toLowerCase() === this.newTenant.email.toLowerCase() ||
      tenant.username.toLowerCase() === this.newTenant.username.toLowerCase()
    );

    if (isDuplicate) {
      this.bulkError = 'Tenant with this name, email, or username already exists in the list';
      return;
    }

    this.tenantsToCreate.push({ ...this.newTenant });
    this.newTenant = {
      name: '',
      email: '',
      username: '',
      password: '',
      phone: '',
      age: null,
      address: '',
      description: ''
    };
    this.bulkError = '';
  }

  removeTenantFromList(index: number): void {
    this.tenantsToCreate.splice(index, 1);
  }

  parseCsvData(): void {
    this.tenantsToCreate = [];
    this.csvErrors = [];

    if (!this.csvData.trim()) {
      return;
    }

    const lines = this.csvData.trim().split('\n');
    const seen = new Set<string>();

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        return; // Skip empty lines
      }

      const parts = trimmedLine.split(',').map(part => part.trim());
      
      if (parts.length < 4) {
        this.csvErrors.push(`Line ${lineNumber}: Missing required fields (name, email, username, password)`);
        return;
      }

      const [name, email, username, password, phone = '', age = '', address = '', description = ''] = parts;

      if (!name) {
        this.csvErrors.push(`Line ${lineNumber}: Name is required`);
        return;
      }

      if (!email) {
        this.csvErrors.push(`Line ${lineNumber}: Email is required`);
        return;
      }

      if (!username) {
        this.csvErrors.push(`Line ${lineNumber}: Username is required`);
        return;
      }

      if (!password) {
        this.csvErrors.push(`Line ${lineNumber}: Password is required`);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.csvErrors.push(`Line ${lineNumber}: Invalid email format`);
        return;
      }

      // Check for duplicates within CSV
      const key = `${name.toLowerCase()}|${email.toLowerCase()}|${username.toLowerCase()}`;
      if (seen.has(key)) {
        this.csvErrors.push(`Line ${lineNumber}: Duplicate name, email, or username`);
        return;
      }
      seen.add(key);

      this.tenantsToCreate.push({
        name: name,
        email: email,
        username: username,
        password: password,
        phone: phone,
        age: age ? parseInt(age) : null,
        address: address,
        description: description
      });
    });
  }

  async createTenants(): Promise<void> {
    if (this.tenantsToCreate.length === 0) {
      return;
    }

    this.isCreating = true;
    this.operationResult = null;

    try {
      const result = await this.tenantService.createMultipleTenants(this.tenantsToCreate).toPromise();
      
      this.operationResult = {
        success: result.created.length > 0,
        title: result.created.length === this.tenantsToCreate.length ? 'All Tenants Created!' : 'Partial Success',
        message: `${result.created.length} of ${this.tenantsToCreate.length} tenants created successfully.`,
        details: result
      };

      // Clear form if all succeeded
      if (result.created.length === this.tenantsToCreate.length) {
        this.tenantsToCreate = [];
        this.csvData = '';
      }
      
      this.tenantsUpdated.emit();
    } catch (error: any) {
      console.error('Error creating tenants:', error);
      this.operationResult = {
        success: false,
        title: 'Error',
        message: error?.error?.message || 'Failed to create tenants. Please try again.'
      };
    } finally {
      this.isCreating = false;
    }
  }

  // Add a single tenant via form
  async addTenant(): Promise<void> {
    // Basic validation
    if (!this.newTenant.name.trim() || !this.newTenant.email.trim() || 
        !this.newTenant.username.trim() || !this.newTenant.password.trim()) {
      this.bulkError = 'Name, email, username, and password are required';
      return;
    }

    if (this.newTenant.password.length < 6) {
      this.bulkError = 'Password must be at least 6 characters long';
      return;
    }

    if (this.newTenant.username.length < 3) {
      this.bulkError = 'Username must be at least 3 characters long';
      return;
    }

    try {
      this.bulkLoading = true;
      this.bulkError = '';
      this.bulkSuccess = '';

      const result = await this.tenantService.createMultipleTenants([this.newTenant]).toPromise();
      
      if (result.summary.successful > 0) {
        this.bulkSuccess = `Tenant "${this.newTenant.name}" created successfully`;
        // Reset form
        this.newTenant = {
          name: '',
          email: '',
          username: '',
          password: '',
          phone: '',
          age: null,
          address: '',
          description: ''
        };
      }
      
      if (result.failed && result.failed.length > 0) {
        this.bulkError = result.failed[0].error;
      }
      
    } catch (error: any) {
      this.bulkError = error.error?.message || 'Failed to create tenant';
    } finally {
      this.bulkLoading = false;
    }
  }
} 