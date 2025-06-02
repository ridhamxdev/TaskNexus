import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class RegisterComponent {
  username = '';
  password = '';
  error = '';
  success = '';

  constructor(private auth: AuthService, private router: Router) {}

  register() {
    this.auth.register(this.username, this.password).subscribe({
      next: () => {
        this.success = 'Registration successful! Please login.';
        this.error = '';
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message || 'Registration failed';
        this.success = '';
      }
    });
  }
}
