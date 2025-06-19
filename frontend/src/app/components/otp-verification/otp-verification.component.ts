import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-otp-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.css']
})
export class OtpVerificationComponent implements OnInit {
  otp: string = '';
  email: string = '';
  tempUserId: number = 0;
  isVerifying: boolean = false;
  isResending: boolean = false;
  error: string = '';
  success: string = '';
  
  // Timer for resend OTP
  resendTimer: number = 60;
  canResend: boolean = false;
  private timerInterval: any;

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get email and tempUserId from query params
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.tempUserId = parseInt(params['tempUserId']) || 0;
      
      // If no email or tempUserId, redirect to login
      if (!this.email || !this.tempUserId) {
        this.router.navigate(['/login']);
        return;
      }

      this.startResendTimer();
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  startResendTimer() {
    this.canResend = false;
    this.resendTimer = 60;
    
    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        this.canResend = true;
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  verifyOTP() {
    if (!this.otp || this.otp.length !== 6) {
      this.error = 'Please enter a valid 6-digit OTP';
      return;
    }

    this.isVerifying = true;
    this.error = '';
    this.success = '';

    this.auth.verifyOTP(this.email, this.otp, this.tempUserId).subscribe({
      next: (response) => {
        this.success = 'Login successful! Redirecting...';
        
        // Store token and user data
        this.auth.setToken(response.access_token);
        this.auth.setUser(response.user);
        
        // Store user info for future login recognition
        this.storeUserForFutureLogin(response.user);
        
        // Redirect based on user role
        setTimeout(() => {
          const redirectUrl = this.auth.getDefaultRoute();
          this.router.navigate([redirectUrl]);
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Invalid or expired OTP. Please try again.';
        this.isVerifying = false;
        this.otp = ''; // Clear OTP input
      }
    });
  }

  resendOTP() {
    if (!this.canResend || this.isResending) {
      return;
    }

    this.isResending = true;
    this.error = '';
    this.success = '';

    this.auth.resendOTP(this.email).subscribe({
      next: (response) => {
        this.success = 'New verification code sent to your email';
        this.isResending = false;
        this.startResendTimer();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to resend OTP. Please try again.';
        this.isResending = false;
      }
    });
  }

  private storeUserForFutureLogin(user: any) {
    // Store minimal user info for session-based recognition
    const userInfo = {
      name: user.name,
      email: user.email,
      lastLoginDate: new Date().toISOString()
    };
    sessionStorage.setItem('lastLoggedInUser', JSON.stringify(userInfo));
  }

  goBackToLogin() {
    this.router.navigate(['/login']);
  }

  // Auto-focus next input when typing OTP
  onOtpInput(event: any, index: number) {
    const value = event.target.value;
    
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
    
    // Update OTP string
    this.updateOtpString();
  }

  // Handle backspace in OTP inputs
  onOtpKeydown(event: any, index: number) {
    if (event.key === 'Backspace' && !event.target.value && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  // Update OTP string from individual inputs
  updateOtpString() {
    let otpValue = '';
    for (let i = 0; i < 6; i++) {
      const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
      if (input) {
        otpValue += input.value || '';
      }
    }
    this.otp = otpValue;
  }

  // Handle paste in OTP inputs
  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    
    if (pastedData.length === 6 && /^\d{6}$/.test(pastedData)) {
      for (let i = 0; i < 6; i++) {
        const input = document.getElementById(`otp-${i}`) as HTMLInputElement;
        if (input) {
          input.value = pastedData[i];
        }
      }
      this.updateOtpString();
    }
  }
} 