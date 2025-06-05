import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  standalone: true,
  imports: [CommonModule]
})
export class ProfileComponent implements OnInit {
  profile: any = null;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.auth.getProfile().subscribe({
      next: (res) => this.profile = res,
      error: (err) => this.error = err.error?.message || 'Failed to load profile'
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
