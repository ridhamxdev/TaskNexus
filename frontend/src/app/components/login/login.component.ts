import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessagesModule,
    MessageModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = '';
  isLoading = false;
  isReturningUser = false;
  lastKnownUserName = '';
  justSwitchedUser = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.checkReturningUser();
  }

  private checkReturningUser() {
    // Check if we have previous user data stored in session
    const lastUser = sessionStorage.getItem('lastLoggedInUser');
    console.log('Checking for returning user:', lastUser);
    
    if (lastUser) {
      try {
        const userData = JSON.parse(lastUser);
        console.log('Found user data:', userData);
        this.isReturningUser = true;
        this.lastKnownUserName = userData.name;
        this.email = userData.email; // Pre-fill email for convenience
        console.log('Set returning user:', this.isReturningUser, this.lastKnownUserName);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        sessionStorage.removeItem('lastLoggedInUser'); // Clean up corrupted data
      }
    } else {
      console.log('No returning user data found');
      this.isReturningUser = false;
      this.lastKnownUserName = '';
      this.email = '';
    }
  }

  private storeUserForFutureLogin(user: any) {
    // Store minimal user info for session-based recognition
    const userInfo = {
      name: user.name,
      email: user.email,
      lastLoginDate: new Date().toISOString()
    };
    console.log('Storing user for future login:', userInfo);
    sessionStorage.setItem('lastLoggedInUser', JSON.stringify(userInfo));
    console.log('Stored in sessionStorage:', sessionStorage.getItem('lastLoggedInUser'));
  }

  clearStoredUser() {
    console.log('clearStoredUser() called - switching to different user mode');
    console.log('Button clicked successfully!');
    
    // Clear sessionStorage
    sessionStorage.removeItem('lastLoggedInUser');
    console.log('Removed lastLoggedInUser from sessionStorage');
    
    // Reset component state immediately
    this.isReturningUser = false;
    this.lastKnownUserName = '';
    this.email = '';
    this.password = '';
    this.error = '';
    this.justSwitchedUser = true;
    
    console.log('Reset component state:', {
      isReturningUser: this.isReturningUser,
      lastKnownUserName: this.lastKnownUserName,
      email: this.email
    });
    
    // Optional: Add a small visual feedback
    this.showSwitchUserFeedback();
  }

  private showSwitchUserFeedback() {
    // Clear any existing errors
    this.error = '';
    
    console.log('User switched to different user mode');
    
    // Focus on email input for new user to start fresh
    setTimeout(() => {
      const emailInput = document.getElementById('email') as HTMLInputElement;
      if (emailInput) {
        emailInput.focus();
        emailInput.select(); // Select any text that might be there
      }
    }, 100);
  }

  login() { // Temporary debug alert
    this.error = ''; // Clear any previous errors
    this.isLoading = true;
    
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.isLoading = false;
        
        // Check if 2FA is required
        if (res.requiresOTP) {
          // Navigate to OTP verification page with query parameters
          this.router.navigate(['/verify-otp'], {
            queryParams: {
              email: res.email,
              tempUserId: res.tempUserId
            }
          });
        } else {
          // Old flow - direct login (fallback)
          this.auth.setToken(res.access_token);
          this.auth.setUser(res.user);
          
          // Store user info for future login recognition
          this.storeUserForFutureLogin(res.user);
          
          const redirectUrl = this.auth.redirectUrl || this.auth.getDefaultRoute();
          this.auth.redirectUrl = '';
          this.router.navigate([redirectUrl]);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.error?.message || 'Login failed';
      }
    });
  }

  onEmailInput() {
    // Reset the switch user flag when user starts typing
    this.justSwitchedUser = false;
  }

  onPasswordKeyUp(event: any) {
    if (event.key === 'Enter') {
      this.login();
    }
  }

  

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
