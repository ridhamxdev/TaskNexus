import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { AuthService } from '../../services/auth.service';

interface InvitationDetails {
  id: number;
  tenantName: string;
  tenantDescription?: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  message?: string;
  expiresAt: string;
  status: string;
}

@Component({
  selector: 'app-invitation-accept',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './invitation-accept.component.html',
  styleUrl: './invitation-accept.component.css'
})
export class InvitationAcceptComponent implements OnInit {
  acceptForm: FormGroup;
  invitation: InvitationDetails | null = null;
  loading = false;
  error: string | null = null;
  success = false;
  token: string | null = null;
  isLoggedIn = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    public router: Router,
    private tenantService: TenantService,
    public authService: AuthService
  ) {
    this.acceptForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    this.isLoggedIn = this.authService.isLoggedIn();
    
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.loadInvitation();
      } else {
        this.error = 'Invalid invitation link';
      }
    });

    // If user is already logged in, don't require name/password
    if (this.isLoggedIn) {
      this.acceptForm.patchValue({
        userName: this.authService.getUser()?.name || '',
      });
      this.acceptForm.get('userName')?.disable();
      this.acceptForm.get('password')?.clearValidators();
      this.acceptForm.get('confirmPassword')?.clearValidators();
      this.acceptForm.updateValueAndValidity();
    }
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  loadInvitation() {
    if (!this.token) return;

    this.loading = true;
    this.error = null;

    this.tenantService.getInvitationByToken(this.token).subscribe({
      next: (response) => {
        this.invitation = response.invitation;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading invitation:', error);
        this.error = error.error?.message || 'Failed to load invitation details';
        this.loading = false;
      }
    });
  }

  acceptInvitation() {
    if (!this.acceptForm.valid || !this.token) return;

    this.loading = true;
    this.error = null;

    const acceptData = {
      invitationToken: this.token,
      ...(this.isLoggedIn ? {} : {
        userName: this.acceptForm.get('userName')?.value,
        password: this.acceptForm.get('password')?.value
      })
    };

    this.tenantService.acceptInvitation(acceptData).subscribe({
      next: (response) => {
        this.success = true;
        this.loading = false;
        
        // If new user was created, log them in
        if (!this.isLoggedIn && response.user) {
          this.authService.setToken(response.token);
          this.authService.setUser(response.user);
        }

        // Redirect after 2 seconds
        setTimeout(() => {
          if (response.redirectUrl) {
            window.location.href = response.redirectUrl;
          } else {
            this.router.navigate(['/dashboard']);
          }
        }, 2000);
      },
      error: (error) => {
        console.error('Error accepting invitation:', error);
        this.error = error.error?.message || 'Failed to accept invitation';
        this.loading = false;
      }
    });
  }

  rejectInvitation() {
    if (!this.token) return;

    this.loading = true;
    this.error = null;

    this.tenantService.rejectInvitation({ 
      invitationToken: this.token,
      reason: 'User declined invitation'
    }).subscribe({
      next: () => {
        this.router.navigate(['/'], { 
          queryParams: { message: 'Invitation declined successfully' }
        });
      },
      error: (error) => {
        console.error('Error rejecting invitation:', error);
        this.error = error.error?.message || 'Failed to reject invitation';
        this.loading = false;
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.acceptForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['mismatch']) return 'Passwords do not match';
    }
    return '';
  }

  getRoleBadgeClass(role: string): string {
    return this.tenantService.getRoleBadgeClass(role);
  }
} 