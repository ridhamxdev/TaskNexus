import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const user = this.authService.getUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    const expectedRoles = route.data['expectedRoles'] as Array<string>;
    
    if (!expectedRoles || expectedRoles.length === 0) {
      return true; // No role restriction
    }

    // Handle impersonation: superadmin impersonating a user should access user routes
    if (this.authService.getIsImpersonating()) {
      const originalUser = this.authService.getOriginalUser();
      // If original user is superadmin and target route expects 'user', allow access
      if (originalUser?.role === 'superadmin' && expectedRoles.includes('user')) {
        return true;
      }
      // If impersonated user role matches expected roles, allow access
      if (expectedRoles.includes(user.role)) {
        return true;
      }
    }

    // Normal role checking
    if (expectedRoles.includes(user.role)) {
      return true;
    }

    // Redirect based on user role (but don't redirect during impersonation)
    if (!this.authService.getIsImpersonating()) {
      if (user.role === 'superadmin') {
        this.router.navigate(['/superadmin-dashboard']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
    
    return false;
  }
} 