import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { API_CONFIG, buildApiUrl } from '../config/api.config';

export interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  feeAmount?: number;
  feeType?: 'SEND_MONEY' | 'ADD_MONEY' | 'SUBSCRIPTION';
  isFeeTransaction?: boolean;
  user?: {
    email: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = buildApiUrl(API_CONFIG.ENDPOINTS.TRANSACTIONS);

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getAllTransactions(): Observable<Transaction[]> {
    // Manual auth headers for reliable authentication
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<Transaction[]>(this.apiUrl, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getTransactionsForUser(userId: string): Observable<Transaction[]> {
    // Manual auth headers for reliable authentication
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<Transaction[]>(`${this.apiUrl}/user/${userId}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  sendMoney(recipientEmail: string, amount: number): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const body = { recipientEmail, amount };
    return this.http.post<any>(`${this.apiUrl}/send`, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getTransactionsWithFees(): Observable<any[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any[]>(`${this.apiUrl}/with-fees`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Add method for users to get their own transactions with fees
  getUserTransactionsWithFees(userId: string): Observable<any[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}/with-fees`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  getAllFeeTransactions(): Observable<any[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any[]>(`${this.apiUrl}/fee-transactions`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
} 