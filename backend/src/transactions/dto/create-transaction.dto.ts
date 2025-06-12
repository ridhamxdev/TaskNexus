export class CreateTransactionDto {
  amount: number;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  userId: number;
  transactionDate: Date;
} 