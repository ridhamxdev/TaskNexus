import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  login() {
    this.error = ''; // Clear any previous errors
    
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        // Set token and user data
        this.auth.setToken(res.access_token);
        this.auth.setUser(res.user); // Use user data from login response
        
        // Navigate to intended URL or default dashboard
        const redirectUrl = this.auth.redirectUrl || '/dashboard';
        this.auth.redirectUrl = '/dashboard'; // Reset redirect URL
        this.router.navigate([redirectUrl]);
      },
      error: (err) => {
        this.error = err.error?.message || 'Login failed';
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
