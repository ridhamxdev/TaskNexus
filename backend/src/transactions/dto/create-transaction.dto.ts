export class CreateTransactionDto {
  amount: number;
  description: string;
  type: string;
  userId: number;
  date: Date;
} 