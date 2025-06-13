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
    // Skip interceptor for login and register endpoints
    const isAuthEndpoint = req.url.includes('/auth/login') || 
                          req.url.includes('/users/register');
    
    if (isAuthEndpoint) {
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