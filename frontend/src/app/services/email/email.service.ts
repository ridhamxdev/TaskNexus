import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmailResponse {
  id: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = 'http://localhost:3000'; // Change to your backend URL

  constructor(private http: HttpClient) {}

  sendEmail(emailData: { recipient: string; subject: string; body: string }): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/emails/send-direct`, emailData, { headers });
  }

  runTestDeduction(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post(`${this.apiUrl}/test-deduction`, {}, { headers });
  }
} 