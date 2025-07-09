export class CreateTransactionDto {
  amount: number;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  userId: number;
  transactionDate: Date;
  isFeeTransaction?: boolean;
  feeAmount?: number;
  feeType?: 'SEND_MONEY' | 'ADD_MONEY' | 'SUBSCRIPTION';
} 