import { Component } from '@angular/core';
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
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  isLoading = false;

  constructor(private auth: AuthService, private router: Router) {}

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

  onPasswordKeyUp(event: any) {
    if (event.key === 'Enter') {
      this.login();
    }
  }

  

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
