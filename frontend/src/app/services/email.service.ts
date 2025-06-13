import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface EmailResponse {
  id: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = 'http://localhost:3000';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  sendEmail(emailData: { recipient: string; subject: string; body: string }): Observable<any> {
    // Manual auth headers for reliable authentication
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/emails/send-direct`, emailData, { headers });
  }

  getEmailStatus(id: number): Observable<any> {
    // Manual auth headers for reliable authentication
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get(`${this.apiUrl}/emails/status/${id}`, { headers });
  }
} 