import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tenant-creation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './tenant-creation.component.html',
  styleUrls: ['./tenant-creation.component.css']
})
export class TenantCreationComponent implements OnInit {
  tenantForm: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private fb: FormBuilder,
    private tenantService: TenantService,
    private authService: AuthService,
    private router: Router
  ) {
    this.tenantForm = this.createForm();
  }

  ngOnInit(): void {
    this.checkPermissions();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\+?[\d\s-()]+$/)]],
      age: ['', [Validators.min(0), Validators.max(200)]],
      address: [''],
      description: ['', [Validators.maxLength(500)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
    });
  }

  async checkPermissions(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user || user.role !== 'superadmin') {
      this.error = 'Only Super Administrators can create tenants';
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 3000);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.tenantForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    this.success = null;

    try {
      const formData = this.tenantForm.value;
      
      const tenantData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        age: formData.age ? parseInt(formData.age) : undefined,
        address: formData.address,
        description: formData.description,
        password: formData.password
      };

      const result = await this.tenantService.createTenant(tenantData).toPromise();
      
      this.success = `Tenant "${result.name}" created successfully! Redirecting to tenant list...`;
      
      // Reset form
      this.tenantForm.reset();

      // Redirect after success
      setTimeout(() => {
        this.router.navigate(['/tenants']);
      }, 2000);

    } catch (error: any) {
      this.error = error.error?.message || 'Failed to create tenant. Please try again.';
      console.error('Tenant creation error:', error);
    } finally {
      this.loading = false;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.tenantForm.controls).forEach(key => {
      const control = this.tenantForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.tenantForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.tenantForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} is too short`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['pattern']) return `${fieldName} contains invalid characters`;
      if (field.errors['min']) return `${fieldName} value is too low`;
      if (field.errors['max']) return `${fieldName} value is too high`;
    }
    return '';
  }

  cancel(): void {
    this.router.navigate(['/tenants']);
  }
} 