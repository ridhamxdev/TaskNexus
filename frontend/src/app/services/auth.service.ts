import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000'; // Change to your backend URL

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private getStorage(): Storage | null {
    if (isPlatformBrowser(this.platformId)) {
      return window.localStorage;
    }
    return null;
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
  }

  register(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/register`, { email, password });
  }

  getProfile(): Observable<any> {
    const storage = this.getStorage();
    const token = storage?.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/users/profile`, { headers });
  }

  logout() {
    const storage = this.getStorage();
    storage?.removeItem('token');
  }

  isLoggedIn(): boolean {
    const storage = this.getStorage();
    return !!storage?.getItem('token');
  }
}
