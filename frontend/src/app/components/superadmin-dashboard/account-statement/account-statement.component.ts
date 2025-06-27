import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  transactionDate: string;
  user: {
    name: string;
    email: string;
  };
}

@Component({
  selector: 'app-account-statement',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-statement.component.html',
  styleUrls: ['./account-statement.component.css']
})
export class AccountStatementComponent {
  @Input() transactions: Transaction[] = [];

  constructor(public auth: AuthService) {}

  get myTransactions(): Transaction[] {
    const myId = this.auth.getUser()?.id;
    if (!myId || !this.transactions) {
      return [];
    }
    return this.transactions.filter(tx => tx.userId === myId);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
} 