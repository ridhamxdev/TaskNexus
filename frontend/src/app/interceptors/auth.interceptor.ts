import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip interceptor for public endpoints only
    const publicEndpoints = [
      '/auth/login', 
      '/auth/verify-otp',
      '/auth/resend-otp',
      '/users/register'
    ];
    
    const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));
    
    if (isPublicEndpoint) {
      return next.handle(req);
    }

    // Get the auth token from the service
    const authToken = this.authService.getToken();
    
    // Clone the request and add the authorization header if token exists
    let authReq = req;
    if (authToken && authToken.trim() !== '') {
      authReq = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    } else {
      // If no token and it's a protected endpoint, redirect to login
      if (!this.router.url.includes('/login')) {
        this.router.navigate(['/login']);
        return throwError(() => new Error('No authentication token'));
      }
    }

    // Send the cloned request with header to the next handler
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized responses globally
        if (error.status === 401) {
          // Only auto-logout if not on login page
          if (!this.router.url.includes('/login')) {
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }

        return throwError(() => error);
      })
    );
  }
} 