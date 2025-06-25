import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-two-factor-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './two-factor-settings.component.html',
  styleUrls: ['./two-factor-settings.component.css']
})
export class TwoFactorSettingsComponent implements OnInit {
  user: any = null;
  password = '';
  otp = '';
  isLoading = false;
  error = '';
  success = '';
  showPasswordPrompt = false;
  showOTPPrompt = false;
  currentAction: 'enable' | 'disable' | null = null;

  constructor(
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.user = profile;
        // Update the auth service user data to keep it in sync
        this.authService.setUser(profile);
      },
      error: (err) => {
        this.error = 'Failed to load profile';
      }
    });
  }

  initiate2FAToggle(action: 'enable' | 'disable') {
    this.currentAction = action;
    this.showPasswordPrompt = true;
    this.showOTPPrompt = false;
    this.password = '';
    this.otp = '';
    this.error = '';
    this.success = '';
  }

  confirmPassword() {
    if (!this.password) {
      this.error = 'Please enter your password';
      return;
    }

    this.isLoading = true;
    this.error = '';

    const serviceMethod = this.currentAction === 'enable' ? 
      this.authService.enable2FA(this.password) : 
      this.authService.disable2FA(this.password);

    serviceMethod.subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        if (response.requiresOTP) {
          this.showPasswordPrompt = false;
          this.showOTPPrompt = true;
          this.success = response.message;
        } else {
          // No OTP required - operation complete
          this.success = response.message;
          this.showPasswordPrompt = false;
          this.currentAction = null;
          this.password = '';
          this.loadUserProfile(); // Reload profile to update 2FA status
          this.updateAuthServiceUser(); // Update the auth service user data
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || `Failed to ${this.currentAction} 2FA`;
      }
    });
  }

  confirmOTP() {
    if (!this.otp) {
      this.error = 'Please enter the OTP code';
      return;
    }

    this.isLoading = true;
    this.error = '';

    const serviceMethod = this.currentAction === 'enable' ? 
      this.authService.confirmEnable2FA(this.otp) : 
      this.authService.confirmDisable2FA(this.otp);

    serviceMethod.subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.success = response.message;
        this.showOTPPrompt = false;
        this.currentAction = null;
        this.password = '';
        this.otp = '';
        this.loadUserProfile(); // Reload profile to update 2FA status
        this.updateAuthServiceUser(); // Update the auth service user data
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Invalid OTP code';
      }
    });
  }

  updateAuthServiceUser() {
    // Update the user data in auth service to reflect 2FA status changes
    if (this.user) {
      this.authService.setUser(this.user);
    }
  }

  cancel() {
    this.showPasswordPrompt = false;
    this.showOTPPrompt = false;
    this.currentAction = null;
    this.password = '';
    this.otp = '';
    this.error = '';
    this.success = '';
  }

  clearMessages() {
    this.error = '';
    this.success = '';
  }
} 