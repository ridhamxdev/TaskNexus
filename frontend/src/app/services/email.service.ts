import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_CONFIG } from '../config/api.config';

export interface EmailResponse {
  id: number;
  message: string;
}

export interface SentEmail {
  id: number;
  recipient: string;
  subject: string;
  body?: string;
  status: string;
  sentAt: string;
  createdAt: string;
  attempts?: number;
  failureReason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = API_CONFIG.BASE_URL;

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

  getSentEmails(): Observable<SentEmail[]> {
    // Manual auth headers for reliable authentication
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<SentEmail[]>(`${this.apiUrl}/emails/sent`, { headers });
  }
} 