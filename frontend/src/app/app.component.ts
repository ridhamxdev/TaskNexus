import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, NavbarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'frontend';
  showNavbar = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Listen to route changes to determine when to show navbar
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateNavbarVisibility(event.url);
    });

    // Listen to impersonation state changes
    this.authService.impersonationSubject.subscribe(() => {
      this.updateNavbarVisibility(this.router.url);
    });

    // Listen to user changes
    this.authService.userSubject.subscribe(() => {
      this.updateNavbarVisibility(this.router.url);
    });
  }

  ngOnInit(): void {
    // Set initial navbar visibility based on current route
    this.updateNavbarVisibility(this.router.url);
  }

  private updateNavbarVisibility(url: string): void {
    // Don't show navbar on login, register, OTP verification, or superadmin routes
    const hideNavbarRoutes = ['/login', '/register', '/verify-otp', '/superadmin-dashboard'];
    const shouldHideNavbar = hideNavbarRoutes.some(route => url.startsWith(route));
    
    if (shouldHideNavbar) {
      this.showNavbar = false;
      return;
    }

    // Show navbar for authenticated users with 'user' role OR during impersonation
    const user = this.authService.getUser();
    const isImpersonating = this.authService.getIsImpersonating();
    
    this.showNavbar = this.authService.isLoggedIn() && 
                     (user?.role === 'user' || isImpersonating);
  }
}
