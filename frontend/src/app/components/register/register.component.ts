import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  phone = '';
  error = '';
  success = '';
  showPassword = false;
  isLoading = false;

  constructor(private auth: AuthService, private router: Router) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  register() {
    if (this.isLoading) return;

    // Reset messages
    this.error = '';
    this.success = '';
    this.isLoading = true;

    this.auth.register({
      name: this.username,
      email: this.email,
      password: this.password,
      phone: this.phone
    }).subscribe({
      next: () => {
        this.success = 'Registration successful! Redirecting to login...';
        this.error = '';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message || 'Registration failed. Please try again.';
        this.success = '';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}
