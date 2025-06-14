import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CookieService } from './cookie.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000'; // Change to your backend URL
  private user: any;
  redirectUrl: string = ''; // Will be set based on user role

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {}

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
    sessionStorage.removeItem('user');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getDefaultRoute(): string {
    const user = this.getUser();
    if (user?.role === 'superadmin') {
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
}
