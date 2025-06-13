import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    email: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = 'http://localhost:3000/transactions';

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