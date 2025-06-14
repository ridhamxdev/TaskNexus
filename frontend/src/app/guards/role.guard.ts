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

    if (expectedRoles.includes(user.role)) {
      return true;
    }

    // Redirect based on user role
    if (user.role === 'superadmin') {
      this.router.navigate(['/superadmin-dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
    
    return false;
  }
} 