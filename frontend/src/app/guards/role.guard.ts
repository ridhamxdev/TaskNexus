import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
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
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    const expectedRoles = route.data['roles'] as Array<string>;
    const user = this.authService.getUser();

    if (!this.authService.isLoggedIn()) {
      this.authService.redirectUrl = state.url;
      return this.router.createUrlTree(['/login']);
    }

    if (expectedRoles && expectedRoles.length > 0) {
      if (!user || !expectedRoles.includes(user.role)) {
        // User doesn't have required role
        return this.router.createUrlTree(['/unauthorized']);
      }
    }

    return true;
  }
} 