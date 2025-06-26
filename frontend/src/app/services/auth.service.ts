import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { CookieService } from './cookie.service';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = API_CONFIG.BASE_URL;
  private user: any;
  private originalUser: any; // Store original admin user during impersonation
  private isImpersonating: boolean = false;
  redirectUrl: string = ''; // Will be set based on user role
  
  // BehaviorSubject for reactive user updates
  public userSubject = new BehaviorSubject<any>(null);
  public impersonationSubject = new BehaviorSubject<boolean>(false);
  user$: any;

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {
    // Initialize user from storage on service creation
    this.initializeUser();
  }
  
  private initializeUser() {
    const storedUser = sessionStorage.getItem('user');
    const storedOriginalUser = sessionStorage.getItem('originalUser');
    const storedImpersonating = sessionStorage.getItem('isImpersonating');
    
    if (storedUser) {
      this.user = JSON.parse(storedUser);
      this.userSubject.next(this.user);
    }
    
    if (storedOriginalUser) {
      this.originalUser = JSON.parse(storedOriginalUser);
    }
    
    if (storedImpersonating) {
      this.isImpersonating = JSON.parse(storedImpersonating);
      this.impersonationSubject.next(this.isImpersonating);
    }
  }

  setToken(token: string): void {
    this.cookieService.set('token', token);
  }

  getToken(): string | null {
    return this.cookieService.get('token');
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
  }

  setUser(user: any) {
    this.user = user;
    // Also store in sessionStorage for persistence across page refreshes
    sessionStorage.setItem('user', JSON.stringify(user));
    // Notify subscribers of user change
    this.userSubject.next(user);
  }

  getUser() {
    if (this.user) {
      return this.user;
    }
    
    // Try to get from sessionStorage if not in memory
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
      return this.user;
    }
    
    return null;
  }

  register(data: { name: string; email: string; password: string; phone: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/register`, data);
  }

  getProfile(): Observable<any> {
    // Manual auth headers for reliable authentication
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/users/profile`, { headers });
  }

  logout() {
    this.cookieService.delete('token');
    this.user = null;
    this.originalUser = null;
    this.isImpersonating = false;
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('originalUser');
    sessionStorage.removeItem('isImpersonating');
    // Notify subscribers of user logout
    this.userSubject.next(null);
    this.impersonationSubject.next(false);
    // Keep lastLoggedInUser data so "Welcome Back" shows after logout
    // Only clear it when user manually chooses "Sign in as different user"
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getDefaultRoute(): string {
    const user = this.getUser();
    if (user?.role === 'superadmin' && !this.isImpersonating) {
      return '/superadmin-dashboard';
    }
    return '/dashboard';
  }

  addMoney(amount: number): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.apiUrl}/users/add-money`, { amount }, { headers });
  }

  updateProfile(profileData: any): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.apiUrl}/users/profile`, profileData, { headers });
  }

  // 2FA Methods
  verifyOTP(email: string, otp: string, tempUserId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-otp`, {
      email,
      otp,
      tempUserId
    });
  }

  resendOTP(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-otp`, { email });
  }

  // 2FA Management Methods
  enable2FA(password: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/auth/enable-2fa`, { password }, { headers });
  }

  confirmEnable2FA(otp: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/auth/confirm-enable-2fa`, { otp }, { headers });
  }

  disable2FA(password: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/auth/disable-2fa`, { password }, { headers });
  }

  confirmDisable2FA(otp: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/auth/confirm-disable-2fa`, { otp }, { headers });
  }

  // Impersonation Methods
  startImpersonation(targetUser: any): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.post(`${this.apiUrl}/superadmin/impersonate`, { 
      targetUserId: targetUser.id 
    }, { headers });
  }

  beginImpersonation(targetUser: any, impersonationToken: string) {
    // Store original admin user and their token
    const currentToken = this.getToken();
    this.originalUser = { 
      ...this.user,
      originalToken: currentToken // Store original admin token
    };
    sessionStorage.setItem('originalUser', JSON.stringify(this.originalUser));
    
    // Set up impersonation
    this.isImpersonating = true;
    sessionStorage.setItem('isImpersonating', JSON.stringify(true));
    
    // Update token and user - this marks the user as fully authenticated
    this.setToken(impersonationToken);
    
    // Enhance target user data to ensure complete authentication state
    const enhancedTargetUser = {
      ...targetUser,
      isAuthenticated: true,
      isImpersonated: true,
      skipOTP: true // Flag to bypass any OTP checks
    };
    
    this.setUser(enhancedTargetUser);
    
    // Store impersonated user info for session recognition (prevents login redirects)
    const userInfo = {
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      lastLoginDate: new Date().toISOString(),
      isImpersonated: true
    };
    sessionStorage.setItem('lastLoggedInUser', JSON.stringify(userInfo));
    
    // Notify subscribers
    this.impersonationSubject.next(true);
  }

  stopImpersonation(): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    return this.http.post(`${this.apiUrl}/superadmin/stop-impersonation`, {}, { headers });
  }

  endImpersonation(originalToken?: string) {
    if (this.originalUser) {
      // Restore original admin user
      const tokenToUse = originalToken || this.originalUser.originalToken;
      if (tokenToUse && tokenToUse.trim() !== '') {
        this.setToken(tokenToUse);
      }
      
      // Clean up the original user data before setting it
      const cleanOriginalUser = { ...this.originalUser };
      delete cleanOriginalUser.originalToken;
      
      this.setUser(cleanOriginalUser);
      
      // Clear impersonation state
      this.originalUser = null;
      this.isImpersonating = false;
      sessionStorage.removeItem('originalUser');
      sessionStorage.removeItem('isImpersonating');
      
      // Restore original admin user session info
      const adminUserInfo = {
        name: this.user.name,
        email: this.user.email,
        role: this.user.role,
        lastLoginDate: new Date().toISOString(),
        isImpersonated: false
      };
      sessionStorage.setItem('lastLoggedInUser', JSON.stringify(adminUserInfo));
      
      // Notify subscribers
      this.impersonationSubject.next(false);
    }
  }

  getIsImpersonating(): boolean {
    return this.isImpersonating;
  }

  getOriginalUser(): any {
    return this.originalUser;
  }

  getImpersonatedUser(): any {
    return this.isImpersonating ? this.user : null;
  }
}
