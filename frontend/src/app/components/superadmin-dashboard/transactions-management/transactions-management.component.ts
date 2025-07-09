import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TreeTableModule } from 'primeng/treetable';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TreeNode } from 'primeng/api';

import { SuperadminService } from '../../../services/superadmin.service';
import { TransactionService } from '../../../services/transaction.service';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Transaction {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  transactionDate: string;
  feeAmount?: number;
  feeType?: 'SEND_MONEY' | 'ADD_MONEY' | 'SUBSCRIPTION';
  isFeeTransaction?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-transactions-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    InputTextModule, 
    DropdownModule, 
    CalendarModule, 
    TableModule,
    TreeTableModule
  ],
  templateUrl: './transactions-management.component.html',
  styleUrls: ['./transactions-management.component.css']
})
export class TransactionsManagementComponent implements OnInit {
  @Input() users: User[] = [];
  
  transactions: TreeNode<Transaction>[] = [];
  flatTransactions: Transaction[] = [];
  cols: any[] = [];
  
  // Error handling
  transactionsError: string | null = null;

  constructor(
    private superadminService: SuperadminService,
    private transactionService: TransactionService
  ) {
    this.cols = [
      { field: 'id', header: 'ID', width: '8rem' },
      { field: 'userName', header: 'User', width: '25rem' },
      { field: 'amount', header: 'Amount', width: '12rem' },
      { field: 'type', header: 'Type', width: '10rem' },
      { field: 'transactionDate', header: 'Date', width: '12rem' },
      { field: 'description', header: 'Description', width: '20rem' }
    ];
  }

  ngOnInit() {
    this.loadTransactions();
  }

  async loadTransactions() {
    try {
      console.log('Loading transactions...');
      this.transactionsError = null;
      
      try {
        const { firstValueFrom } = await import('rxjs');
        const treeData = await firstValueFrom(this.transactionService.getTransactionsWithFees());
        console.log('Tree data response:', treeData);
        
        // Convert to TreeNode format for PrimeNG TreeTable
        this.transactions = treeData.map((node: any, index: number) => {
          const nodeKey = `tx_${node.data.id}`;
          const treeNode: TreeNode<Transaction> = {
            key: nodeKey,
            data: {
              id: node.data.id,
              userId: node.data.userId,
              userName: node.data.userName,
              userEmail: node.data.userEmail,
              amount: Number(node.data.amount),
              type: node.data.type,
              description: node.data.description,
              transactionDate: node.data.transactionDate,
              feeAmount: node.data.feeAmount ? Number(node.data.feeAmount) : undefined,
              feeType: node.data.feeType,
              isFeeTransaction: node.data.isFeeTransaction || false,
              createdAt: node.data.createdAt,
              updatedAt: node.data.updatedAt
            },
            children: node.children?.map((child: any, childIndex: number) => ({
              key: `${nodeKey}_fee_${child.data.id}`,
              data: {
                id: child.data.id,
                userId: child.data.userId,
                userName: child.data.userName,
                userEmail: child.data.userEmail,
                amount: Number(child.data.amount),
                type: child.data.type,
                description: child.data.description,
                transactionDate: child.data.transactionDate,
                feeAmount: child.data.feeAmount ? Number(child.data.feeAmount) : undefined,
                feeType: child.data.feeType,
                isFeeTransaction: true,
                createdAt: child.data.createdAt,
                updatedAt: child.data.updatedAt
              }
            })) || []
          };
          
          // Note: Auto-expansion will be handled after view initialization
          
          return treeNode;
        });

        // Also create flat list for statistics
        this.flatTransactions = [];
        this.transactions.forEach(treeNode => {
          if (treeNode.data) {
            this.flatTransactions.push(treeNode.data);
            if (treeNode.children) {
              treeNode.children.forEach(child => {
                if (child.data) {
                  this.flatTransactions.push(child.data);
                }
              });
            }
          }
        });

        console.log('Processed transactions as tree nodes:', this.transactions);
        console.log('Flat transactions for stats:', this.flatTransactions);
      } catch (error) {
        console.error('Failed to load transactions:', error);
        this.transactionsError = 'Failed to load transactions. Please try again.';
        this.transactions = [];
        this.flatTransactions = [];
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.transactionsError = 'Failed to load transactions. Please try again.';
      this.transactions = [];
      this.flatTransactions = [];
    }
  }

  // Helper method to format currency
  formatCurrency(amount: number): string {
    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).replace('₹', '₹ '); // Add space after symbol
  }

  // Helper method to format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Helper method to get fee type label
  getFeeTypeLabel(feeType?: string): string {
    if (!feeType) return 'Transaction Fee';
    
    switch (feeType) {
      case 'SEND_MONEY':
        return 'Send Money Fee';
      case 'ADD_MONEY':
        return 'Add Money Fee';
      case 'SUBSCRIPTION':
        return 'Subscription Fee';
      default:
        return 'Transaction Fee';
    }
  }

  // Get total transactions count (excluding fees)
  getTotalTransactionCount(): number {
    return this.flatTransactions.filter(tx => !tx.isFeeTransaction).length;
  }

  // Get total credits
  getTotalCredits(): number {
    return this.flatTransactions
      .filter(tx => tx.type === 'CREDIT' && !tx.isFeeTransaction)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  // Get total debits
  getTotalDebits(): number {
    return this.flatTransactions
      .filter(tx => tx.type === 'DEBIT' && !tx.isFeeTransaction)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  // Get net flow
  getNetFlow(): number {
    return this.getTotalCredits() - this.getTotalDebits();
  }

  // Refresh functionality
  refreshTransactions(): void {
    this.loadTransactions();
  }

  // Statistics calculations (excluding fee transactions to avoid double counting)
  getMainTransactions(): Transaction[] {
    return this.flatTransactions.filter(tx => !tx.isFeeTransaction);
  }

  getFeeTransactions(): Transaction[] {
    return this.flatTransactions.filter(tx => tx.isFeeTransaction);
  }

  // Fee-specific statistics
  getTotalFeeCredits(): number {
    return this.flatTransactions
      .filter(tx => tx.type === 'CREDIT' && tx.isFeeTransaction)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  getTotalFeeDebits(): number {
    return this.flatTransactions
      .filter(tx => tx.type === 'DEBIT' && tx.isFeeTransaction)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }

  getTotalFeeTransactionCount(): number {
    return this.flatTransactions.filter(tx => tx.isFeeTransaction).length;
  }
} 